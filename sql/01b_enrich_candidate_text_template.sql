-- Template for the second step. First create/upload a small candidate table with
-- publication_number, then enrich only those rows with title and abstract.
-- Replace `aeropatent.candidate_pubnums` with the actual table name.
SELECT
  p.publication_number,
  p.country_code AS publication_country_code,
  p.family_id,
  p.publication_date,
  p.priority_date,
  p.grant_date,
  COALESCE(
    ARRAY_TO_STRING(ARRAY(SELECT text FROM UNNEST(p.title_localized) WHERE LOWER(language) = 'en' LIMIT 1), ' '),
    ARRAY_TO_STRING(ARRAY(SELECT text FROM UNNEST(p.title_localized) LIMIT 1), ' ')
  ) AS title_text,
  COALESCE(
    ARRAY_TO_STRING(ARRAY(SELECT language FROM UNNEST(p.title_localized) WHERE LOWER(language) = 'en' LIMIT 1), ' '),
    ARRAY_TO_STRING(ARRAY(SELECT language FROM UNNEST(p.title_localized) LIMIT 1), ' ')
  ) AS title_language,
  COALESCE(
    ARRAY_TO_STRING(ARRAY(SELECT text FROM UNNEST(p.abstract_localized) WHERE LOWER(language) = 'en' LIMIT 1), ' '),
    ARRAY_TO_STRING(ARRAY(SELECT text FROM UNNEST(p.abstract_localized) LIMIT 1), ' ')
  ) AS abstract_text,
  COALESCE(
    ARRAY_TO_STRING(ARRAY(SELECT language FROM UNNEST(p.abstract_localized) WHERE LOWER(language) = 'en' LIMIT 1), ' '),
    ARRAY_TO_STRING(ARRAY(SELECT language FROM UNNEST(p.abstract_localized) LIMIT 1), ' ')
  ) AS abstract_language,
  ARRAY(SELECT AS STRUCT name, country_code FROM UNNEST(p.assignee_harmonized) LIMIT 5) AS assignees,
  ARRAY(SELECT DISTINCT country_code FROM UNNEST(p.assignee_harmonized) WHERE country_code IS NOT NULL) AS assignee_country_codes,
  ARRAY(SELECT code FROM UNNEST(p.cpc) LIMIT 20) AS cpc_codes
FROM `patents-public-data.patents.publications` p
JOIN `aeropatent.candidate_pubnums` c
USING (publication_number);
