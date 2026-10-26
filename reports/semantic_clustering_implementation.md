# Semantic patent clustering

## Scope

This pipeline processes recorded titles and abstracts in `normalized/patents.jsonl`.
It does not claim text-level coverage of the BigQuery landscape. Seed-note placeholders
are treated as title-only records. Search terms, CPC labels, field labels, and generated
summaries are never fed into the encoder.

## Method

- Model: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, pinned revision
  in `config/semantic_clustering.json`. CPU inference; no paid inference API or API key.
- Long documents: overlapping 110-token windows, token-weighted mean of normalized
  384-dimensional embeddings, then L2 normalization.
- Family deduplication: average unique document embeddings within each recorded family.
  Missing family IDs remain independent publications. Same-family publications are
  excluded from related-patent recommendations.
- Clustering: scikit-learn complete-linkage agglomerative clustering with cosine distance.
  Minimum within-cluster similarity is 0.62. Singletons remain unclustered.
- Edges: union of each family's top four neighbours above the same threshold. Sparse
  edges are recommendations; they are not citations or evidence of overlapping claims.
- Labels: extractive TF-IDF keywords from member texts, not generated LLM descriptions.
- Configuration thresholds are exploratory defaults, not calibrated accuracy probabilities.
  Inspect related/unrelated patent pairs and subject-matter expert feedback before using
  clusters as validated technology categories.

## Run

```powershell
uv venv .cache/semantic-venv --python 3.12
uv pip install --python .cache/semantic-venv/Scripts/python.exe torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
uv pip install --python .cache/semantic-venv/Scripts/python.exe -r scripts/requirements-semantic.txt
.cache/semantic-venv/Scripts/python.exe -m unittest discover -s scripts -p test_semantic_clusters.py
.cache/semantic-venv/Scripts/python.exe scripts/build_semantic_clusters.py
```

The first run downloads public model weights. Embeddings are cached under `.cache/`,
not shipped to browsers. The checked-in `analysis/semantic_clusters.json` contains
model provenance, input hashes, clusters, memberships, text-quality flags, and measured
similarity edges. Identical reruns preserve the existing timestamp.

On Windows ARM64, install an x86-64 Python interpreter for the CPU PyTorch wheel:
`uv python install cpython-3.12-windows-x86_64-none`, then create the venv with
`--python cpython-3.12-windows-x86_64-none`. The inference runtime is separate from
the website and is not needed to serve or browse the static site.

Web builds fail if the input file hash changes without regenerating the analysis.
The monthly GitHub workflow regenerates semantic analysis before building the website.
This step does not fetch new abstracts or expand the existing text corpus. Adding new
enriched patent records expands coverage on the next run. The current exact algorithm
rejects more than 5,000 families instead of silently sampling or allocating an unbounded
distance matrix. Larger corpora require a separate batched enrichment and ANN design.

## Website and MCP

Graph View has semantic colours, measured similarity edges, a semantic layout, and
selectable cluster nodes. Cluster selection opens the existing animated camera and
report drawer. Reports include member publications, family counts, provenance, and
cosine scores. Related-patent search accepts a `cluster` URL filter.

MCP tool: `get_semantic_clusters` with optional `clusterId`, `publicationNumber`, `limit`.
MCP resource: `aeropatent://semantic/clusters`.
`get_graph_neighbors` also includes semantic clusters and measured edges. MCP reads
the saved results and does not invoke a model during requests; restart it after an update.

## References

- https://sbert.net/docs/sentence_transformer/usage/semantic_textual_similarity.html
- https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
- https://scikit-learn.org/stable/modules/generated/sklearn.cluster.AgglomerativeClustering.html
