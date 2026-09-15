# Source Limitations

- This is a first-pass seed corpus for product design and graph/RAG implementation.
- It is not a freedom-to-operate, validity, infringement, or legal-status opinion.
- Google Patents legal status and assignee fields may be assumptions or translated.
- Official source refresh needs credentials or compliant interactive export paths:
  USPTO ODP, EPO OPS, KIPRIS Plus, J-PlatPat, and CNIPA.
- Google Patents CSV/XHR bulk download returned rate limiting during manual probing,
  so this run fetched individual publication pages through Jina Reader.

## Current production and evidence boundaries (reviewed 2026-09-16)

- The web aggregate uses `exports/agentbridge/agentbridge_patent_landscape_snapshot.json`: 728,312 distinct families, 1,945,811 publications and 2,450,063 field-publication rows, aggregated on 2026-09-12. These are CPC-prefix candidates, not text-validated aerospace inventions.
- The retained collection manifest records 2026-06-28 and 2,522,788 rows, which does not reconcile with the current aggregate. Neither its raw input nor the sibling production snapshot is present locally. The actual collection date and raw-data reproducibility remain unverified; aggregation time is not collection time.
- Search and graph use 63 of 65 manually selected seed publications (five displayed offices; two WO publications excluded). These are not a random sample of the 728,312-family universe. Three aviation fields have no seed documents.
- Displayed country shares divide by the sum of five office-family membership counts, not by the worldwide distinct-family total. Offices and fields overlap; an office is not the applicant's domicile.
- Seed filing years use recorded filing dates, with explicit publication-year fallback where missing. Suspect source priority dates are retained and flagged; no source date is silently corrected. Cached source pages are unavailable for adjudication.
- Seed sorting scores use recorded matching-term and family-office counts, not citations, patent value, or legal strength. Only recorded matching terms generate document-keyword links.
- Aggregate recent-share and KR-gap measures use rolling date windows. Deep-dive yearly, KR-publication applicant and citation tables use a separate 2016–2025 priority-date cohort. Neither series corrects publication/indexing lag.
- The citation table counts distinct other citing families linked to a candidate publication; family self-citations are excluded. Citing time is unrestricted; counts are not normalized for age or field and do not prove value.
- The CR5-like measure sums the top five source-name family counts divided by distinct field families. Co-applicants can overlap, and names are not entity-resolved; this is not a mutually exclusive market share.
