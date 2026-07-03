-- Preview-only monthly monitoring query using CPC first. This keeps LIMIT 500
-- for UI/schema checks. Do not use this limited result for metrics.
WITH field_taxonomy AS (
  SELECT 'space_launch_propulsion_recovery' AS field_id, ['B64G1','F02K9','F02K99'] AS cpc_prefixes
  UNION ALL SELECT 'space_satellite_bus_thermal_power', ['B64G1','H01L31','F28D15']
  UNION ALL SELECT 'space_comm_leo_network', ['H04B7','H04W84','H04L45']
  UNION ALL SELECT 'space_remote_sensing_payload', ['G01S13','G01S7','G01J3']
  UNION ALL SELECT 'space_gnc_rendezvous_servicing', ['B64G1','G05D1','G01C21']
  UNION ALL SELECT 'space_materials_tps_coatings', ['C04B35','C09D5','B32B']
  UNION ALL SELECT 'aviation_propulsion_sustainable', ['B64D27','B64D33','F02C7','F02K3']
  UNION ALL SELECT 'aviation_structures_aero_composites', ['B64C3','B64C21','B64C23','B29C70']
  UNION ALL SELECT 'aviation_avionics_flight_control_autonomy', ['G05D1','B64C13','G08G5','G01C21']
),
recent AS (
  SELECT
    publication_number,
    country_code,
    family_id,
    publication_date,
    priority_date,
    grant_date,
    assignee_harmonized,
    cpc
  FROM `patents-public-data.patents.publications`
  WHERE publication_date >= CAST(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH)) AS INT64)
)
SELECT
  r.publication_number,
  r.country_code,
  r.family_id,
  r.publication_date,
  r.priority_date,
  r.grant_date,
  f.field_id,
  ARRAY(SELECT AS STRUCT name, country_code FROM UNNEST(r.assignee_harmonized) LIMIT 5) AS assignees,
  ARRAY(SELECT code FROM UNNEST(r.cpc) LIMIT 10) AS cpc_codes
FROM recent r
CROSS JOIN field_taxonomy f
WHERE EXISTS (
  SELECT 1
  FROM UNNEST(r.cpc) c
  JOIN UNNEST(f.cpc_prefixes) prefix
  ON STARTS_WITH(c.code, prefix)
)
LIMIT 500;
