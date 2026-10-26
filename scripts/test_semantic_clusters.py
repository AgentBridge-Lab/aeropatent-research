import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
from build_semantic_clusters import assemble, cluster_vectors, corpus_hash, read_documents


CONFIG = {"model": "test", "revision": "test", "similarity_threshold": 0.62, "max_neighbors": 2, "max_families": 5000}


def doc(pub, family):
    return {"id": "patent." + pub, "publication_number": pub, "family_id": family,
            "country": "US", "title": "Satellite thermal management", "text": "Satellite thermal management heat pipes",
            "text_basis": "title_abstract", "text_hash": pub}


class SemanticTests(unittest.TestCase):
    def test_singleton_is_not_forced_into_cluster(self):
        self.assertEqual(cluster_vectors(np.array([[1., 0.]]), 0.62).tolist(), [-1])

    def test_unrelated_text_vectors_remain_unclustered(self):
        result = assemble([doc("A", "a"), doc("B", "b")],
                          {"patent.A": np.array([1., 0.]), "patent.B": np.array([0., 1.])}, CONFIG)
        self.assertEqual(result["clusters"], [])
        self.assertEqual(result["edges"], [])
        self.assertEqual(result["summary"]["unclustered_family_count"], 2)

    def test_same_family_is_not_a_neighbor(self):
        docs = [doc("A", "one"), doc("A2", "one"), doc("B", "two")]
        vectors = {d["id"]: np.array([1., 0.]) for d in docs}
        result = assemble(docs, vectors, CONFIG)
        self.assertEqual(result["summary"]["family_count"], 2)
        self.assertEqual(result["clusters"][0]["family_count"], 2)
        self.assertEqual(len(result["edges"]), 1)
        self.assertNotEqual(result["edges"][0]["source_family"], result["edges"][0]["target_family"])
        self.assertEqual(result["membership"]["patent.A"], result["membership"]["patent.A2"])

    def test_complete_linkage_does_not_chain_unrelated_endpoints(self):
        angles = np.radians([0, 40, 80])
        vectors = np.column_stack([np.cos(angles), np.sin(angles)])
        labels = cluster_vectors(vectors, 0.62)
        self.assertFalse(labels[0] == labels[1] == labels[2])
        self.assertEqual(sum(labels == -1), 1)

    def test_family_limit_fails_without_silent_sampling(self):
        docs = [doc("A", "a"), doc("B", "b")]
        with self.assertRaises(ValueError):
            assemble(docs, {}, {**CONFIG, "max_families": 1})

    def test_input_uses_text_and_excludes_seed_summary_tags(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "patents.jsonl"
            target.write_text(json.dumps({"publication_number": "US1", "title": "Heat pipe",
                "abstract": "Seed placeholder", "seed_note": "Seed placeholder", "llm_summary_ko": "DO NOT ENCODE",
                "matched_terms": ["DO NOT ENCODE"], "family_id": None}) + "\n", encoding="utf-8")
            docs = read_documents(target)
            self.assertEqual(docs[0]["text"], "Heat pipe")
            self.assertEqual(docs[0]["text_basis"], "title_only")
            self.assertEqual(docs[0]["family_id"], "publication:US1")

    def test_input_digest_changes_on_family_or_text_change(self):
        docs = [doc("A", "one")]
        self.assertNotEqual(corpus_hash(docs), corpus_hash([{**docs[0], "family_id": "two"}]))
        self.assertNotEqual(corpus_hash(docs), corpus_hash([{**docs[0], "text_hash": "changed"}]))


if __name__ == "__main__":
    unittest.main()
