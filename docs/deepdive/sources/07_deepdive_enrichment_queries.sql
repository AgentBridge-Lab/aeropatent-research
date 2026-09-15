-- deepdive_enrichment.json 산출 쿼리 (2026-09-12 실행분, 재현용)
-- 공통: 우선일 2016-01-01~2025-12-31, CPC 접두어 후보군 기준 (sql/01a와 동일 taxonomy)
-- 실행 가드: --maximum_bytes_billed=40000000000 권장 (실측: Q1 ~26.5GB, Q3 ~28.1GB, Q4 ~19.3GB)
-- 결과 병합: Q1 → fields.*.yearly_families / Q2 → kr_top_applicants / Q3+Q4 → top_cited

-- ── 공통 CTE ──────────────────────────────────────────────────────────
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
), base AS (
  SELECT publication_number, country_code, family_id, priority_date, assignee_harmonized, cpc
  FROM `patents-public-data.patents.publications`
  WHERE priority_date BETWEEN 20160101 AND 20251231
), cand AS (
  SELECT b.*, f.field_id FROM base b CROSS JOIN field_taxonomy f
  WHERE EXISTS (SELECT 1 FROM UNNEST(b.cpc) c JOIN UNNEST(f.cpc_prefixes) p ON STARTS_WITH(c.code, p))
)

-- ── Q1: 필드별 연도별 패밀리 수 (yearly_families) ─────────────────────
SELECT field_id, CAST(FLOOR(priority_date / 10000) AS INT64) AS yr,
       COUNT(DISTINCT family_id) AS families
FROM cand
GROUP BY field_id, yr
ORDER BY field_id, yr;

-- ── Q2: 필드별 KR 공개 상위 출원인 (kr_top_applicants) ────────────────
-- 주의: assignee_harmonized 언네스트 시 country_code 모호 → cand.country_code로 한정
SELECT field_id, a.name AS applicant, COUNT(DISTINCT family_id) AS families
FROM cand, UNNEST(assignee_harmonized) a
WHERE cand.country_code = 'KR'
GROUP BY field_id, applicant
QUALIFY ROW_NUMBER() OVER (PARTITION BY field_id ORDER BY families DESC, applicant) <= 8
ORDER BY field_id, families DESC, applicant;

-- ── Q3: 필드별 피인용 상위 패밀리 (top_cited) ─────────────────────────
SELECT cand.field_id, cand.family_id AS cited_family, MIN(cand.publication_number) AS rep_pub,
       COUNT(DISTINCT citing.family_id) AS citing_families
FROM `patents-public-data.patents.publications` citing, UNNEST(citing.citation) ct
JOIN cand ON ct.publication_number = cand.publication_number
WHERE citing.family_id != cand.family_id
GROUP BY field_id, cited_family
QUALIFY ROW_NUMBER() OVER (PARTITION BY field_id ORDER BY citing_families DESC, cited_family) <= 5
ORDER BY field_id, citing_families DESC, cited_family;

-- ── Q4: Q3 대표 공보의 영문 제목 (top_cited[].title_en) ───────────────
-- {REP_PUBS} = Q3 결과 rep_pub 목록 ('US-10042359-B1', ...)
SELECT publication_number,
       (SELECT text FROM UNNEST(title_localized) WHERE language = 'en' LIMIT 1) AS title_en
FROM `patents-public-data.patents.publications`
WHERE publication_number IN ({REP_PUBS});
