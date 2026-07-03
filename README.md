# AEROPATENT Research Corpus

This directory stores the first patent-research corpus for the aerospace patent
analysis website.

The current corpus is a web-accessible seed investigation across US, EP, JP, CN,
and KR publications. Official source-of-record APIs are documented in
`config/source_registry.json`; they require credentials or interactive access for
full exhaustive collection.

## Structure

- `config/`: taxonomy, source registry, and repeatable search protocol.
- `raw/jina_pages/`: fetched patent-page markdown snapshots from Google Patents
  through Jina Reader.
- `normalized/`: JSONL documents designed for LLM/RAG lookup.
- `graph/`: node/edge files for the LLM Wiki graph view.
- `analysis/`: country, field, period, and insight aggregates.
- `reports/`: Korean report markdown and UI-ready report card JSON.

Run:

```powershell
python .\scripts\collect_and_build.py
```

Build AgentBridge-ready patent evidence packs from the normalized seed corpus:

```powershell
node .\scripts\build_agentbridge_evidence_packs.mjs
```

This writes per-program packs under
`reports/agentbridge_program_evidence_packs/`, a summary file under
`analysis/agentbridge_evidence_pack_summary.json`, and syncs the combined static
data file into `..\spline-interaction-hero\app\data\agentbridge_program_evidence_packs.json`
when that AgentBridge app folder exists.
