-- Validation sample for human review. This is not a metric query.
-- Review the sampled title/abstract/CPC rows and mark true positive / false
-- positive / missing field to estimate classification precision.
SELECT
  field_id,
  publication_country_code,
  publication_number,
  family_id,
  priority_date,
  title_text,
  abstract_text,
  assignees,
  assignee_country_codes,
  cpc_codes
FROM `aeropatent.normalized_candidates`
WHERE field_id = @field_id
ORDER BY FARM_FINGERPRINT(publication_number)
LIMIT 50;
