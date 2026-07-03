-- Dry-run first. This query is the broad 10-year aerospace/aviation candidate
-- finder. It intentionally avoids claims, description, and embeddings.
WITH field_taxonomy AS (
  SELECT 'space_launch_propulsion_recovery' AS field_id,
    r'(launch vehicle|rocket engine|reusable launch vehicle|booster recovery|vertical landing|cryogenic propulsion|hybrid propulsion|rocket stage)' AS keyword_regex,
    ['B64G1','F02K9','F02K99'] AS cpc_prefixes
  UNION ALL SELECT 'space_satellite_bus_thermal_power',
    r'(satellite bus|spacecraft platform|thermal control|satellite radiator|heat pipe|solar array|spacecraft power)',
    ['B64G1','H01L31','F28D15']
  UNION ALL SELECT 'space_comm_leo_network',
    r'(satellite communication|LEO constellation|inter-satellite link|satellite network|beam hopping|satellite MIMO|edge computing satellite)',
    ['H04B7','H04W84','H04L45']
  UNION ALL SELECT 'space_remote_sensing_payload',
    r'(synthetic aperture radar|SAR imaging|remote sensing satellite|earth observation|digital beamforming|wide swath|multispectral imaging)',
    ['G01S13','G01S7','G01J3']
  UNION ALL SELECT 'space_gnc_rendezvous_servicing',
    r'(attitude control|orbit control|rendezvous|docking|on-orbit servicing|proximity operation|debris removal)',
    ['B64G1','G05D1','G01C21']
  UNION ALL SELECT 'space_materials_tps_coatings',
    r'(thermal protection|ablative material|spacecraft coating|radiation shielding|ceramic tile|rocket insulation|high temperature coating)',
    ['C04B35','C09D5','B32B']
  UNION ALL SELECT 'aviation_propulsion_sustainable',
    r'(aircraft engine|turbofan|hybrid electric aircraft|electric propulsion aircraft|hydrogen aircraft|sustainable aviation fuel|fuel cell aircraft)',
    ['B64D27','B64D33','F02C7','F02K3']
  UNION ALL SELECT 'aviation_structures_aero_composites',
    r'(aircraft wing|fuselage|airframe|composite aircraft structure|laminar flow|aerodynamic surface|morphing wing)',
    ['B64C3','B64C21','B64C23','B29C70']
  UNION ALL SELECT 'aviation_avionics_flight_control_autonomy',
    r'(flight control|autopilot|avionics|aircraft navigation|autonomous aircraft|sense and avoid|flight management system)',
    ['G05D1','B64C13','G08G5','G01C21']
),
base AS (
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
  WHERE priority_date BETWEEN CAST(FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 10 YEAR)) AS INT64)
      AND CAST(FORMAT_DATE('%Y%m%d', CURRENT_DATE()) AS INT64)
)
SELECT
  b.publication_number,
  b.country_code,
  b.family_id,
  b.publication_date,
  b.priority_date,
  b.grant_date,
  f.field_id,
  b.title_en,
  b.abstract_en,
  ARRAY(SELECT AS STRUCT name, country_code FROM UNNEST(b.assignee_harmonized) LIMIT 5) AS assignees,
  ARRAY(SELECT code FROM UNNEST(b.cpc) LIMIT 10) AS cpc_codes,
  CASE
    WHEN REGEXP_CONTAINS(LOWER(CONCAT(IFNULL(b.title_en, ''), ' ', IFNULL(b.abstract_en, ''))), f.keyword_regex) THEN 1
    ELSE 0
  END AS keyword_hit,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM UNNEST(b.cpc) c
      JOIN UNNEST(f.cpc_prefixes) prefix
      ON STARTS_WITH(c.code, prefix)
    ) THEN 1
    ELSE 0
  END AS cpc_hit
FROM base b
CROSS JOIN field_taxonomy f
WHERE REGEXP_CONTAINS(LOWER(CONCAT(IFNULL(b.title_en, ''), ' ', IFNULL(b.abstract_en, ''))), f.keyword_regex)
  OR EXISTS (
    SELECT 1
    FROM UNNEST(b.cpc) c
    JOIN UNNEST(f.cpc_prefixes) prefix
    ON STARTS_WITH(c.code, prefix)
  )
LIMIT 1000;
