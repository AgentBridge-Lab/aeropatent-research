-- Monthly monitoring query. This should be much cheaper than the 10-year
-- candidate finder because it scans only recent publication dates.
WITH recent AS (
  SELECT
    publication_number,
    country_code,
    family_id,
    publication_date,
    priority_date,
    grant_date,
    ARRAY_TO_STRING(ARRAY(SELECT text FROM UNNEST(title_localized) WHERE language IN ('en', 'EN') LIMIT 1), ' ') AS title_en,
    ARRAY_TO_STRING(ARRAY(SELECT text FROM UNNEST(abstract_localized) WHERE language IN ('en', 'EN') LIMIT 1), ' ') AS abstract_en,
    assignee_harmonized,
    cpc
  FROM `patents-public-data.patents.publications`
  WHERE publication_date >= CAST(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH)) AS INT64)
)
SELECT *
FROM recent
WHERE REGEXP_CONTAINS(
  LOWER(CONCAT(IFNULL(title_en, ''), ' ', IFNULL(abstract_en, ''))),
  r'(aircraft|aviation|aerospace|spacecraft|satellite|launch vehicle|rocket|synthetic aperture radar|flight control|turbofan|hydrogen aircraft|electric aircraft)'
)
LIMIT 500;
