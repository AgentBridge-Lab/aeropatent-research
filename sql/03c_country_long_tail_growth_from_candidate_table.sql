-- Long-tail country growth candidates outside the default major jurisdictions.
-- This surfaces smaller countries only when they have enough recent activity
-- to be useful for research planning or business development.
WITH base AS (
  SELECT
    field_id,
    publication_country_code,
    publication_number,
    family_id,
    priority_date
  FROM `aeropatent.normalized_candidates`
  WHERE publication_country_code NOT IN ('US', 'EP', 'CN', 'JP', 'KR')
),
windowed AS (
  SELECT
    field_id,
    publication_country_code,
    COUNT(DISTINCT IF(
      priority_date >= CAST(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 3 YEAR)) AS INT64),
      family_id,
      NULL
    )) AS recent_3y_family_count,
    COUNT(DISTINCT IF(
      priority_date < CAST(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 3 YEAR)) AS INT64)
      AND priority_date >= CAST(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 6 YEAR)) AS INT64),
      family_id,
      NULL
    )) AS prior_3y_family_count,
    COUNT(DISTINCT publication_number) AS publication_count
  FROM base
  GROUP BY field_id, publication_country_code
),
scored AS (
  SELECT
    field_id,
    publication_country_code,
    recent_3y_family_count,
    prior_3y_family_count,
    publication_count,
    SAFE_DIVIDE(
      recent_3y_family_count - prior_3y_family_count,
      NULLIF(prior_3y_family_count, 0)
    ) AS recent_growth_rate,
    recent_3y_family_count * LOG(1 + GREATEST(recent_3y_family_count - prior_3y_family_count, 0)) AS long_tail_signal_score
  FROM windowed
)
SELECT *
FROM scored
WHERE recent_3y_family_count >= 5
  AND (recent_growth_rate >= 0.5 OR prior_3y_family_count = 0)
ORDER BY long_tail_signal_score DESC, recent_3y_family_count DESC
LIMIT 100;
