# AEROPATENT MCP Server

Local MCP server for the aerospace patent landscape, NASA taxonomy crosswalk, AgentBridge evidence packs, and LLM Wiki graph data.

## Run

```powershell
cd <repo-root>\mcp-server
node .\server.mjs
```

## Smoke Test

```powershell
cd <repo-root>
node .\mcp-server\test_client.mjs
```

## MCP Client Config

Use an absolute path so the client can launch the server from any working directory.

```json
{
  "mcpServers": {
    "aeropatent": {
      "command": "node",
      "args": [
        "<repo-root>\\mcp-server\\server.mjs"
      ]
    }
  }
}
```

## Tools

- `get_global_patent_landscape`: site-ready global/field/country/region/period dashboard metrics from the BigQuery metadata snapshot.
- `search_patents_by_nasa_taxonomy`: local representative patent search plus optional field-level landscape results.
- `get_patent_landscape_for_program`: AgentBridge program-level patent landscape summary.
- `get_taxonomy_crosswalk`: NASA TX to AeroPatent field crosswalk.
- `get_proposal_evidence_pack`: proposal-safe evidence pack with metadata warnings and available evidence chunks.
- `get_graph_neighbors`: LLM Wiki graph neighbors for field, country, taxonomy, corpus, and evidence nodes.

## Resources

- `aeropatent://snapshot/mcp`
- `aeropatent://landscape/global`
- `aeropatent://reports/bigquery-landscape`
- `aeropatent://reports/landscape`
- `aeropatent://taxonomy/nasa-2024`
- `aeropatent://taxonomy/crosswalk`
- `aeropatent://agentbridge/evidence-packs`
- `aeropatent://agentbridge/bigquery-evidence-packs`
- `aeropatent://graph/nodes`
- `aeropatent://graph/edges`

The server reads static JSON/JSONL files from the repository and does not call BigQuery, KIPRIS, Google Patents, or any paid API at runtime.