SELECT
  'TEST-US-1' AS publication_number,
  'US' AS publication_country_code,
  'family-test-1' AS family_id,
  20260115 AS publication_date,
  20250101 AS priority_date,
  0 AS grant_date,
  'space_launch_propulsion_recovery' AS field_id,
  ARRAY<STRUCT<name STRING, country_code STRING>>[
    ('Example Aerospace', 'US'),
    ('Korea Partner Lab', 'KR')
  ] AS assignees,
  ['US', 'KR'] AS assignee_country_codes,
  ['B64G1/00', 'F02K9/00'] AS cpc_codes,
  1 AS cpc_hit
UNION ALL
SELECT
  'TEST-EP-2',
  'EP',
  'family-test-2',
  20240220,
  20220101,
  20240501,
  'space_remote_sensing_payload',
  ARRAY<STRUCT<name STRING, country_code STRING>>[
    ('Orbital Imaging', 'DE')
  ],
  ['DE'],
  ['G01S13/90'],
  1;
