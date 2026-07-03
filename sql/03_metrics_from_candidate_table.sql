-- Run after candidate rows are materialized into a local/project table.
-- Replace `aeropatent.normalized_candidates` with the actual table name.
SELECT
  field_id,
  publication_country_code,
  DIV(priority_date, 10000) AS priority_year,
  COUNT(DISTINCT family_id) AS family_count,
  COUNT(DISTINCT publication_number) AS publication_count,
  COUNT(DISTINCT IF(grant_date IS NOT NULL AND grant_date > 0, publication_number, NULL)) AS grant_publication_count
FROM `aeropatent.normalized_candidates`
GROUP BY field_id, publication_country_code, priority_year
ORDER BY priority_year, field_id, publication_country_code;

