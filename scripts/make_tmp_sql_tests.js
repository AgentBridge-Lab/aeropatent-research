const fs = require("fs");

const opportunity = fs
  .readFileSync("./sql/04_opportunity_score_from_candidate_table.sql", "utf8")
  .replace(/`aeropatent\.normalized_candidates`/g, "normalized_candidates")
  .replace(/^WITH\s+/m, ",\n");

const opportunityTest = `WITH normalized_candidates AS (
  SELECT 'field_a' AS field_id, 'US' AS publication_country_code, 'US1' AS publication_number, 'fam1' AS family_id, 20240101 AS priority_date, 20250101 AS publication_date, 20260101 AS grant_date, ['US'] AS assignee_country_codes
  UNION ALL SELECT 'field_a','KR','KR1','fam1',20240101,20250101,20260101,['US']
  UNION ALL SELECT 'field_a','KR','KR2','fam2',20220101,20230101,0,['KR']
)
${opportunity}`;

fs.writeFileSync("./sql/_tmp_test_opportunity.sql", opportunityTest, "utf8");

const publicationMetrics = fs
  .readFileSync("./sql/03_metrics_from_candidate_table.sql", "utf8")
  .replace(/`aeropatent\.normalized_candidates`/g, "normalized_candidates");

const publicationMetricsTest = `WITH normalized_candidates AS (
  SELECT 'field_a' AS field_id, 'US' AS publication_country_code, 'US1' AS publication_number, 'fam1' AS family_id, 20240101 AS priority_date, 20250101 AS publication_date, 20260101 AS grant_date, ['US'] AS assignee_country_codes
  UNION ALL SELECT 'field_a','KR','KR1','fam1',20240101,20250101,20260101,['US']
  UNION ALL SELECT 'field_a','KR','KR2','fam2',20220101,20230101,0,['KR']
)
${publicationMetrics}`;

fs.writeFileSync("./sql/_tmp_test_publication_metrics.sql", publicationMetricsTest, "utf8");

const assigneeMetrics = fs
  .readFileSync("./sql/03a_assignee_country_metrics_from_candidate_table.sql", "utf8")
  .replace(/`aeropatent\.normalized_candidates`/g, "normalized_candidates");

const assigneeMetricsTest = `WITH normalized_candidates AS (
  SELECT 'field_a' AS field_id, 'US' AS publication_country_code, 'US1' AS publication_number, 'fam1' AS family_id, 20240101 AS priority_date, 20250101 AS publication_date, 20260101 AS grant_date, ['US'] AS assignee_country_codes
  UNION ALL SELECT 'field_a','KR','KR1','fam1',20240101,20250101,20260101,['US']
  UNION ALL SELECT 'field_a','KR','KR2','fam2',20220101,20230101,0,['KR']
)
${assigneeMetrics}`;

fs.writeFileSync("./sql/_tmp_test_assignee_metrics.sql", assigneeMetricsTest, "utf8");

console.log("Temporary SQL tests written.");
