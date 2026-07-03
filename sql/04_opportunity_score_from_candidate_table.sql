-- Run after candidate rows are materialized. This powers Korea gap/opportunity
-- cards for research planning and business development.
--
-- Reliability note:
-- Global field totals are counted directly with COUNT(DISTINCT family_id).
-- Do not sum country-level family counts, because the same family can be
-- published in multiple countries and would be double counted.
WITH field_global AS (
  SELECT
    field_id,
    COUNT(DISTINCT family_id) AS global_family_count,
    COUNT(DISTINCT IF(priority_date >= CAST(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 3 YEAR)) AS INT64), family_id, NULL)) AS global_recent_3y_family_count,
    COUNT(DISTINCT IF(priority_date >= CAST(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 5 YEAR)) AS INT64), family_id, NULL)) AS global_recent_5y_family_count
  FROM `aeropatent.normalized_candidates`
  GROUP BY field_id
),
field_kr_publication_country AS (
  SELECT
    field_id,
    COUNT(DISTINCT IF(publication_country_code = 'KR', family_id, NULL)) AS kr_publication_family_count,
    COUNT(DISTINCT IF(publication_country_code = 'KR'
      AND priority_date >= CAST(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 5 YEAR)) AS INT64), family_id, NULL)) AS kr_publication_recent_5y_family_count
  FROM `aeropatent.normalized_candidates`
  GROUP BY field_id
),
field_kr_assignee_country AS (
  SELECT
    field_id,
    COUNT(DISTINCT IF('KR' IN UNNEST(assignee_country_codes), family_id, NULL)) AS kr_assignee_family_count,
    COUNT(DISTINCT IF('KR' IN UNNEST(assignee_country_codes)
      AND priority_date >= CAST(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 5 YEAR)) AS INT64), family_id, NULL)) AS kr_assignee_recent_5y_family_count
  FROM `aeropatent.normalized_candidates`
  GROUP BY field_id
)
SELECT
  g.field_id,
  g.global_family_count,
  g.global_recent_3y_family_count,
  g.global_recent_5y_family_count,
  p.kr_publication_family_count,
  p.kr_publication_recent_5y_family_count,
  a.kr_assignee_family_count,
  a.kr_assignee_recent_5y_family_count,
  SAFE_DIVIDE(g.global_recent_3y_family_count, NULLIF(g.global_family_count, 0)) AS global_recent_momentum,
  SAFE_DIVIDE(p.kr_publication_recent_5y_family_count, NULLIF(g.global_recent_5y_family_count, 0)) AS kr_publication_recent_share,
  SAFE_DIVIDE(a.kr_assignee_recent_5y_family_count, NULLIF(g.global_recent_5y_family_count, 0)) AS kr_assignee_recent_share,
  SAFE_DIVIDE(g.global_recent_3y_family_count, NULLIF(g.global_family_count, 0))
    * (1 - SAFE_DIVIDE(p.kr_publication_recent_5y_family_count, NULLIF(g.global_recent_5y_family_count, 0))) AS korea_publication_gap_opportunity_score,
  SAFE_DIVIDE(g.global_recent_3y_family_count, NULLIF(g.global_family_count, 0))
    * (1 - SAFE_DIVIDE(a.kr_assignee_recent_5y_family_count, NULLIF(g.global_recent_5y_family_count, 0))) AS korea_assignee_gap_opportunity_score
FROM field_global g
LEFT JOIN field_kr_publication_country p
USING (field_id)
LEFT JOIN field_kr_assignee_country a
USING (field_id)
ORDER BY korea_publication_gap_opportunity_score DESC;
