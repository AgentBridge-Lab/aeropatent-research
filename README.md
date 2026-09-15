# AEROPATENT

항공우주 CPC 특허 후보군의 동향과 대표 문헌, 다중 출처 정규화 연구를 제공하는 정적 사이트입니다.
공개 주소: https://agentbridge-lab.github.io/aeropatent-research/

## 세 가지 자료 범위

| 범위 | 현재 크기 | 해석 |
| --- | ---: | --- |
| CPC 후보군 집계 | 728,312패밀리·1,945,811문헌 | 문헌 내용을 전수 검증한 항공우주 발명 목록이 아닌 CPC 후보군 |
| 검색·그래프 대표 자료 | 63문헌·50패밀리 | 수작업으로 선정한 시드 자료. 전체 집계의 확률표본이 아님 |
| 탐사 방법론 파일럿 | 적격 983패밀리 중 67패밀리 | BQ·OPS·KIPRIS의 수집 범위와 정규화 비교 |

집계 기준일은 2026-09-12입니다. 실제 수집일은 현재 보관 자료로 확인되지 않습니다.
원시 BigQuery 파일이 로컬에 없고 과거 manifest의 행 수도 현재 집계와 달라,
전체 집계의 원자료 재현은 불가능합니다. 상세 근거와 SHA-256은
[`analysis/site_data_provenance.json`](analysis/site_data_provenance.json)에 기록합니다.

## 주요 원본과 생성물

- `exports/agentbridge/agentbridge_patent_landscape_snapshot.json`: 후보군 집계 스냅숏
- `normalized/patents.jsonl`, `normalized/claims.jsonl`: 대표 문헌 원본
- `analysis/deepdive_enrichment.json`: 별도 기간·쿼리로 계산한 심층 보강 자료
- `config/exploration_ds_taxonomy.json`: 탐사 분류체계·파일럿 범위·재현 SQL
- `scripts/sync-web-data.mjs` → `web/app/lib/data.ts`: 앱 데이터 생성
- `scripts/build_deepdive_pages.py` → `docs/deepdive/`: 분야별 심층 페이지
- `scripts/build_exploration_page.py` → `docs/exploration/`: 탐사 방법론 페이지
- `web/app/`: Next.js 화면과 보고서
- `docs/`: 전체 공개 사이트의 정적 생성물

## 기존 자료로 로컬 전체 빌드

기존 의존성이 준비된 환경에서 실행합니다. 아래 명령은 외부 데이터 수집이나 배포를 수행하지 않습니다.

```sh
npm --prefix web run lint
GITHUB_PAGES=true npm --prefix web run build:site
npm --prefix web run typecheck
python3 scripts/verify-static-site.py
node scripts/validate-search-scope.mjs
node scripts/check-country-bars.cjs
node scripts/verify-graph-mobile.cjs
node scripts/verify-data-semantics.mjs
```

`build:site`는 데이터 동기화, Next 내보내기, 심층·탐사 페이지 생성, 전체 정적 링크 검증을 순서대로 실행합니다.
기존 `docs/`는 `.cache/site-export-backups/`에 보관하며 생성 실패 시 복구합니다.
앱만 빌드한 `web/out/`에는 별도 Python 생성 페이지가 없으므로 그대로 공개하지 않습니다.

## 수치 해석과 갱신

- 국가 표시는 출원인의 소재국이 아닌 특허청 관할 기준입니다.
- 최근 3년 비중은 전체 후보 패밀리 중 최근 기간의 비중이며 성장률이 아닙니다.
- 출원인 상위 5개 명칭의 패밀리 수 합계에는 공동 출원 중복이 있으므로 독점적인 시장점유율로 해석하지 않습니다.
- 대표 문헌 출원연도는 원천 출원일을 사용하며, 누락 시 공개연도 대체와 날짜 모순을 표시합니다.
- 달·행성·탐사로봇(DS-1·DS-2·DS-8)의 주층 배정 7건과 다중 소속 합집합 표본 8건은 서로 다른 집계입니다.

월간 갱신 설정은 `.github/workflows/monthly-data-update.yml`에 있습니다.
수집은 인증과 쿼리 비용 통제가 필요한 별도 작업이며 로컬 검수 중 실행하지 않습니다.
`build_agentbridge_exports.mjs` 등의 과거 내보내기 도구는 인접 프로젝트에 파일을 쓸 수 있으므로
현재 사이트 생성에는 위의 `build:site` 경로를 사용합니다.
