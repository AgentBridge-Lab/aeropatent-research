-- Assignee-country metrics are separate from publication-country metrics.
-- Use these for competitor/threat analysis, not for patent-office activity.
SELECT
  field_id,
  assignee_country_code,
  DIV(priority_date, 10000) AS priority_year,
  COUNT(DISTINCT family_id) AS family_count,
  COUNT(DISTINCT publication_number) AS publication_count
FROM `aeropatent.normalized_candidates`,
UNNEST(assignee_country_codes) AS assignee_country_code
WHERE assignee_country_code IS NOT NULL
GROUP BY field_id, assignee_country_code, priority_year
ORDER BY priority_year, field_id, assignee_country_code;
