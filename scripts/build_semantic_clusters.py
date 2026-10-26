"""Build offline, family-deduplicated semantic clusters from recorded patent text."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent


def read_documents(path):
    documents = []
    seen = set()
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        publication = row.get("publication_number")
        title = clean_text(row.get("title", ""))
        if not publication or not title or publication in seen:
            continue
        seen.add(publication)
        abstract = clean_text(row.get("abstract", ""))
        if abstract == clean_text(row.get("seed_note", "")):
            abstract = ""
        # Do not feed field labels, generated summaries, or matched search terms to the encoder.
        text = title + ("\n" + abstract if abstract else "")
        documents.append({
            "id": "patent." + publication,
            "publication_number": publication,
            "family_id": str(row.get("family_id") or "publication:" + publication),
            "country": row.get("authority", ""),
            "title": title,
            "text": text,
            "text_basis": "title_abstract" if abstract else "title_only",
            "text_hash": hashlib.sha256(text.encode()).hexdigest(),
        })
    return sorted(documents, key=lambda doc: doc["id"])


def clean_text(text):
    text = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", str(text or ""))
    return re.sub(r"\s+", " ", text).strip()


def corpus_hash(documents):
    return hashlib.sha256(json.dumps(
        [(doc["id"], doc["family_id"], doc["text_hash"]) for doc in documents],
        separators=(",", ":"), ensure_ascii=False,
    ).encode()).hexdigest()


def cluster_vectors(vectors, threshold):
    import numpy as np
    from sklearn.cluster import AgglomerativeClustering
    if len(vectors) < 2:
        return np.full(len(vectors), -1, dtype=int)
    # Complete linkage bounds every within-cluster pair; chaining cannot merge unrelated topics.
    labels = AgglomerativeClustering(
        n_clusters=None, metric="cosine", linkage="complete",
        distance_threshold=1 - threshold,
    ).fit_predict(vectors)
    counts = Counter(labels)
    return np.array([label if counts[label] >= 2 else -1 for label in labels])


def encode_documents(documents, config, cache_dir):
    import numpy as np
    cache_dir.mkdir(parents=True, exist_ok=True)
    model_key = hashlib.sha256((config["model"] + config["revision"] +
        str(config["chunk_tokens"]) + str(config["chunk_overlap"])).encode()).hexdigest()[:16]
    vectors = {}
    missing = []
    for doc in documents:
        target = cache_dir / (model_key + "-" + doc["text_hash"] + ".npy")
        if target.exists():
            vector = np.load(target, allow_pickle=False)
            if vector.shape != (384,) or not np.isfinite(vector).all() or abs(np.linalg.norm(vector) - 1) > 0.001:
                raise ValueError("Invalid embedding cache: " + target.name)
            vectors[doc["id"]] = vector
        else:
            missing.append(doc)
    if not missing:
        return vectors
    from sentence_transformers import SentenceTransformer
    print(f"Loading pinned multilingual encoder for {len(missing)} uncached documents...", flush=True)
    model = SentenceTransformer(config["model"], revision=config["revision"], device="cpu", trust_remote_code=False)
    model.max_seq_length = 128
    chunks, owners, weights = [], [], []
    for doc in missing:
        tokens = model.tokenizer.encode(doc["text"], add_special_tokens=False, verbose=False)
        step = config["chunk_tokens"] - config["chunk_overlap"]
        for start in range(0, len(tokens), step):
            part = tokens[start:start + config["chunk_tokens"]]
            chunks.append(model.tokenizer.decode(part, skip_special_tokens=True))
            owners.append(doc["id"])
            weights.append(len(part) if start == 0 else max(1, len(part) - config["chunk_overlap"]))
            if start + config["chunk_tokens"] >= len(tokens):
                break
    encoded = model.encode(chunks, batch_size=config["batch_size"], normalize_embeddings=True, show_progress_bar=True)
    for doc in missing:
        indices = [i for i, owner in enumerate(owners) if owner == doc["id"]]
        vector = np.average(encoded[indices], axis=0, weights=[weights[i] for i in indices])
        vector = (vector / np.linalg.norm(vector)).astype(np.float32)
        vectors[doc["id"]] = vector
        np.save(cache_dir / (model_key + "-" + doc["text_hash"] + ".npy"), vector, allow_pickle=False)
    return vectors


def assemble(documents, doc_vectors, config):
    import numpy as np
    grouped = {}
    for doc in documents:
        grouped.setdefault(doc["family_id"], []).append(doc)
    family_ids = sorted(grouped)
    if not family_ids:
        raise ValueError("No patent documents with titles found")
    if len(family_ids) > config["max_families"]:
        raise ValueError("Corpus exceeds max_families; use a scalable ANN pipeline instead of silent sampling")
    representatives, vectors = [], []
    for family_id in family_ids:
        docs = sorted(grouped[family_id], key=lambda doc: (-len(doc["text"]), doc["id"]))
        representatives.append(docs[0])
        # Each unique text gets one vote, regardless of the number of publications carrying it.
        unique = {doc["text_hash"]: doc for doc in docs}
        vector = np.mean([doc_vectors[doc["id"]] for doc in unique.values()], axis=0)
        vectors.append(vector / np.linalg.norm(vector))
    matrix = np.asarray(vectors)
    similarities = np.clip(matrix @ matrix.T, -1, 1)
    labels = cluster_vectors(matrix, config["similarity_threshold"])
    clusters, membership = [], {}
    for label in sorted(set(labels) - {-1}):
        indices = [i for i, value in enumerate(labels) if value == label]
        families = [family_ids[i] for i in indices]
        cluster_id = "cluster." + hashlib.sha256("|".join(families).encode()).hexdigest()[:12]
        pair_scores = [float(similarities[i, j]) for i in indices for j in indices if i < j]
        medoid = max(indices, key=lambda i: (float(similarities[i, indices].mean()), -i))
        publications = sorted(doc["id"] for family in families for doc in grouped[family])
        terms = cluster_terms([doc["text"] for family in families for doc in grouped[family]])
        clusters.append({
            "id": cluster_id, "label": " · ".join(terms[:2]) or representatives[medoid]["title"][:70],
            "terms": terms, "family_ids": families, "patent_ids": publications,
            "family_count": len(families), "publication_count": len(publications),
            "mean_similarity": round(sum(pair_scores) / len(pair_scores), 6),
            "min_similarity": round(min(pair_scores), 6),
            "representative_id": representatives[medoid]["id"],
            "representative_title": representatives[medoid]["title"],
        })
        for publication in publications:
            membership[publication] = cluster_id
    # Keep bounded, measured nearest neighbours. Never recommend a second member of the same family.
    edges, used_pairs = [], set()
    for i in range(len(family_ids)):
        neighbors = sorted((j for j in range(len(family_ids)) if j != i and similarities[i, j] >= config["similarity_threshold"]),
                           key=lambda j: (-float(similarities[i, j]), family_ids[j]))[:config["max_neighbors"]]
        for j in neighbors:
            pair = tuple(sorted((i, j)))
            if pair in used_pairs:
                continue
            used_pairs.add(pair)
            edges.append({"source_family": family_ids[pair[0]], "target_family": family_ids[pair[1]],
                          "similarity": round(float(similarities[pair[0], pair[1]]), 6)})
    public_docs = [{key: value for key, value in doc.items() if key != "text"} for doc in documents]
    return {"schema_version": "aeropatent.semantic.v1", "corpus_hash": corpus_hash(documents),
            "model": {"name": config["model"], "revision": config["revision"], "dimensions": 384},
            "method": {"algorithm": "agglomerative_complete_cosine", "similarity_threshold": config["similarity_threshold"],
                       "max_neighbors": config["max_neighbors"], "input": "title + recorded abstract; chunked mean pooling",
                       "label_method": "extractive TF-IDF terms; not LLM generated"},
            "scope": "recorded_patent_text_only", "documents": public_docs,
            "summary": {"publication_count": len(documents), "family_count": len(family_ids), "cluster_count": len(clusters),
                        "unclustered_family_count": int(sum(labels == -1)), "edge_count": len(edges),
                        "title_only_count": sum(doc["text_basis"] == "title_only" for doc in documents)},
            "clusters": sorted(clusters, key=lambda c: (-c["family_count"], c["id"])),
            "membership": membership, "edges": sorted(edges, key=lambda edge: (-edge["similarity"], edge["source_family"], edge["target_family"]))}


def cluster_terms(texts):
    from sklearn.feature_extraction.text import TfidfVectorizer
    try:
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=3000,
                                    token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z-]{2,}\b")
        values = vectorizer.fit_transform(texts).mean(axis=0).A1
        names = vectorizer.get_feature_names_out()
        ignored = {"invention", "present", "method", "system", "comprises", "includes", "provided", "said"}
        return [names[i] for i in values.argsort()[::-1] if names[i] not in ignored][:6]
    except ValueError:
        return []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=ROOT / "normalized/patents.jsonl")
    parser.add_argument("--output", type=Path, default=ROOT / "analysis/semantic_clusters.json")
    parser.add_argument("--config", type=Path, default=ROOT / "config/semantic_clustering.json")
    parser.add_argument("--cache", type=Path, default=ROOT / ".cache/semantic-embeddings")
    args = parser.parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    if not 0 < config["similarity_threshold"] < 1 or not 0 <= config["chunk_overlap"] < config["chunk_tokens"] <= 126:
        raise ValueError("Invalid similarity or chunk configuration")
    documents = read_documents(args.input)
    if len({doc["family_id"] for doc in documents}) > config["max_families"]:
        raise ValueError("Input exceeds max_families")
    result = assemble(documents, encode_documents(documents, config, args.cache), config)
    result["source_file_hash"] = hashlib.sha256(args.input.read_text(encoding="utf-8-sig").encode()).hexdigest()
    # Identical reruns keep the old timestamp and produce no meaningless commits.
    if args.output.exists():
        previous = json.loads(args.output.read_text(encoding="utf-8"))
        if {k: v for k, v in previous.items() if k != "generated_at"} == result:
            print(json.dumps({"unchanged": True, **result["summary"]}))
            return
    result["generated_at"] = datetime.now(timezone.utc).isoformat()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temp = args.output.with_suffix(".tmp")
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(args.output)
    print(json.dumps(result["summary"]))


if __name__ == "__main__":
    main()
