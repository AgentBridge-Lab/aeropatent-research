-- Publication-region metrics derived from the normalized worldwide candidate table.
-- Use after sql/01a_candidate_10y_cpc_first_production.sql has produced
-- `aeropatent.normalized_candidates`.
WITH country_region AS (
  SELECT 'US' AS country_code, 'NORTH_AMERICA' AS region_id UNION ALL
  SELECT 'CA', 'NORTH_AMERICA' UNION ALL
  SELECT 'MX', 'NORTH_AMERICA' UNION ALL
  SELECT 'EP', 'EUROPE' UNION ALL
  SELECT 'DE', 'EUROPE' UNION ALL
  SELECT 'FR', 'EUROPE' UNION ALL
  SELECT 'GB', 'EUROPE' UNION ALL
  SELECT 'IT', 'EUROPE' UNION ALL
  SELECT 'ES', 'EUROPE' UNION ALL
  SELECT 'NL', 'EUROPE' UNION ALL
  SELECT 'SE', 'EUROPE' UNION ALL
  SELECT 'CH', 'EUROPE' UNION ALL
  SELECT 'AT', 'EUROPE' UNION ALL
  SELECT 'BE', 'EUROPE' UNION ALL
  SELECT 'DK', 'EUROPE' UNION ALL
  SELECT 'FI', 'EUROPE' UNION ALL
  SELECT 'NO', 'EUROPE' UNION ALL
  SELECT 'PL', 'EUROPE' UNION ALL
  SELECT 'CN', 'EAST_ASIA' UNION ALL
  SELECT 'JP', 'EAST_ASIA' UNION ALL
  SELECT 'KR', 'EAST_ASIA' UNION ALL
  SELECT 'TW', 'EAST_ASIA' UNION ALL
  SELECT 'HK', 'EAST_ASIA' UNION ALL
  SELECT 'IN', 'SOUTH_ASIA' UNION ALL
  SELECT 'PK', 'SOUTH_ASIA' UNION ALL
  SELECT 'BD', 'SOUTH_ASIA' UNION ALL
  SELECT 'LK', 'SOUTH_ASIA' UNION ALL
  SELECT 'IL', 'MIDDLE_EAST' UNION ALL
  SELECT 'AE', 'MIDDLE_EAST' UNION ALL
  SELECT 'SA', 'MIDDLE_EAST' UNION ALL
  SELECT 'TR', 'MIDDLE_EAST' UNION ALL
  SELECT 'QA', 'MIDDLE_EAST' UNION ALL
  SELECT 'AU', 'OCEANIA' UNION ALL
  SELECT 'NZ', 'OCEANIA' UNION ALL
  SELECT 'BR', 'LATIN_AMERICA' UNION ALL
  SELECT 'AR', 'LATIN_AMERICA' UNION ALL
  SELECT 'CL', 'LATIN_AMERICA' UNION ALL
  SELECT 'CO', 'LATIN_AMERICA' UNION ALL
  SELECT 'PE', 'LATIN_AMERICA' UNION ALL
  SELECT 'ZA', 'AFRICA' UNION ALL
  SELECT 'EG', 'AFRICA' UNION ALL
  SELECT 'MA', 'AFRICA' UNION ALL
  SELECT 'NG', 'AFRICA' UNION ALL
  SELECT 'KE', 'AFRICA' UNION ALL
  SELECT 'WO', 'INTERNATIONAL'
),
candidate_regions AS (
  SELECT
    c.field_id,
    c.publication_country_code,
    COALESCE(r.region_id, 'OTHER_WORLD') AS region_id,
    c.publication_number,
    c.family_id,
    c.priority_date,
    c.publication_date
  FROM `aeropatent.normalized_candidates` c
  LEFT JOIN country_region r
  ON c.publication_country_code = r.country_code
)
SELECT
  field_id,
  region_id,
  DIV(priority_date, 10000) AS priority_year,
  COUNT(DISTINCT family_id) AS family_count,
  COUNT(DISTINCT publication_number) AS publication_count,
  COUNT(DISTINCT publication_country_code) AS publication_country_count
FROM candidate_regions
GROUP BY field_id, region_id, priority_year
ORDER BY priority_year, field_id, region_id;
