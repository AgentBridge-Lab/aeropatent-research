# AEROPATENT 전체 사이트 검수 · 2026-09-16

## 결과와 반영 범위

로컬 원본 코드와 정적 사이트를 수정했고, 사용자 승인 후 GitHub Pages 공개 사이트에 배포했습니다. 공개 사이트의 변경 전 주요 12개 경로는 HTTP 200이었으며, 이번 작업은 작동 중인 사이트의 데이터 의미·검색 상태·화면 품질·생성 과정에서 확인한 결함을 보완하는 작업입니다. 원시 자료 수집, 설치, Drive 업로드는 실행하지 않았습니다.

**built(구현됨):** 아래 수정 사항 반영. **verified(검증됨):** 최종 빌드·브라우저 검사 PASS. 근거는 아래 검증 절에 기록했습니다. 전체 후보군 원자료 재집계는 원시 파일 부재로 미검증입니다.

## 확인한 문제와 수정

| 구분 | 기존 문제 | 수정 |
| --- | --- | --- |
| 자료 범위 | 후보군·대표 문헌·연구 표본의 해석 혼동 | 728,312 CPC 후보 패밀리, 수동 선정 63문헌·50패밀리, 적격 983 중 파일럿 67패밀리 구분 |
| 대표 문헌 연도 | 우선일을 출원연도로 사용하고 오래된 연도를 1990으로 제한 | 원천 출원일 사용, 누락 3건은 공개연도 대체 표시. 55문헌의 표시연도 변경 |
| 날짜 품질 | 원천의 날짜 모순과 누락을 표시하지 않음 | 우선일·출원일 모순 45건 및 출원일 누락 3건에 주의 표시 |
| 출원인·키워드 | 공개 관할을 소재국으로 추정, 문헌에 없는 분야 검색어 연결 | 소재국 미확인 처리, 원천 matched_terms만 사용하여 근거 없는 문헌–키워드 연결 98개 제거 |
| 검색 | 같은 경로 재검색·뒤로가기 시 이전 조건 유지, 분야 변경 후 숨은 세부분야 조건 유지 | URL 기준 동기화, 분야 전환 시 세부분야 초기화 |
| 그래프 | 계층 모드 구분 미작동, 범례와 실제 색 불일치 | 실제 계층 배치와 노드 유형 색상 일치, 보고서 검색 링크의 과거 조건 제거 |
| 화면·접근성 | 추세축 숫자 잘림, 모바일 표 넘침, 모달 초점 제어 누락 | 축 여백·표 스크롤, 메뉴/보고서 초점 이동·복귀·Escape·Tab 제어 |
| 날짜·지표 | 집계일/수집일 혼용, 최근 비중을 성장률로 설명 | 집계 9/12·실제 수집일 미확인 구분, 최근 3년 비중·최근 5년 KR 분모 명시 |
| 심층 분석 | CR5·CPC 출현 누적·보강 코호트 해석 불명확 | 공동 출원 중복, 행 단위 CPC 출현, 2016–2025 보강 기간과 피인용 한계 명시 |
| 출처 | 집계·SQL·원천 파일 추적 어려움 | 공개 근거 파일·SQL, 해시 포함 provenance 추가 |
| 홈 | 외부 Spline 실패 시 전체 홈 접근 불가 | 장면만 독립 오류 처리, 분석·심층 진입 유지 |
| 빌드 | Next 16에서 동작하지 않는 lint 명령, 별도 페이지 생성 누락 가능 | ESLint 명령 수정, 통합 build:site, 실패 복구, 전체 링크 검사 |
| 탐색 | 사이트맵 일부 경로 누락, 홈 심층 링크를 배포 시 HTML 삽입 | 실제 정적 경로 전체 사이트맵, 홈의 정식 심층 링크 |

탐사 연구의 DS-1·DS-2·DS-8 주층 배정 7건과 표본 내 다중 소속 합집합 8건은 별도 집계입니다. 경계 의심 7건을 임의 삭제하지 않았으며, 983개 모집단의 다중 소속 합계가 계산되지 않았다는 한계를 유지했습니다.

## 검증

- 데이터 생성 정합성: 원천 문헌·연도·키워드·관할 분모·집계 생성기 합성 입력 269항목 PASS.
- 심층 페이지: 6개 페이지 × 4개 폭(320·390·768·1440) = 24조건 자체 검사 PASS. 최종 생성 후 독립 재검사도 PASS.
- 독립 교차 검수: 심층 수치·분모·기간·출처 197항목, 원논문 표본 주요 수치 재현 PASS.
- 생성 도구: 없는 링크·잘못된 공개 접두 경로 검출, 점이 있는 보고서 경로 처리, 생성 실패 시 기존 docs 복구 PASS. 없는 사이트 루트는 FAIL 처리 확인.
- 최종 GitHub Pages 설정 빌드·TypeScript·ESLint·git diff 공백 검사 PASS.
- 전체 HTML 318개 HTTP 200, 내부 참조 187개 누락 0. 정상 경로 315개와 사이트맵 전수 일치·중복 0(오류 화면 3개 제외).
- 주요 12경로와 상세/보고서 7종, 총 19경로 × 4개 화면 폭 = 브라우저 76조건 PASS. 문서 가로 넘침·내부 HTTP 오류·처리되지 않은 JS 오류 0.
- 공개 접두 경로에서 검색·뒤로가기·필터·메뉴/드로어 초점·외부 장면 실패 시 홈 접근 등 동작 30검사 PASS.
- 빠른 재검색·뒤로가기 3회에서 hydration 오류 미재현. 그래프 안정화 후 은하·계층·노드 유형 화면 직접 확인.
- 프런트 결정적 회귀 20항목 및 독립 150개 필터 조합/301검증 PASS. 기존 검색 범위·관할 막대·모바일 그래프 검사 PASS.
- 공개 배포 확인: 콘텐츠 변경 커밋 `a6cc80a`의 GitHub Pages 배포가 완료됐고, 공개 `sitemap.xml` 해시가 로컬과 일치했습니다. 공개 사이트맵 315개 경로 전수 HTTP 200 PASS.

최종 증거: [빌드 로그](../logs/site_build_20260916.txt), [정적 경로 전수 검사](../logs/static_site_final_20260916.json), [브라우저 76조건](../logs/site_browser_final_20260916/results.json), [동작 30검사](../logs/site_frontend_production_20260916.txt), [화면 동기화 검사](../logs/site_hydration_20260916.json), [공개 배포 전수 검사](../logs/deploy_public_verify_20260916.json).
브라우저 76조건 기록의 사이트맵 수 306은 추가 분석 경로 9개 보완 전 값입니다. 이후 화면 코드 변경 없이 사이트맵만 수정·재빌드했으며, 최종 정적 검사에서 315개 전수 일치를 확인했습니다.

## 미검증 사항과 이유

1. **전체 후보군 원집계 재현:** `raw/bigquery/bq_candidates_latest.jsonl`이 없고 인접 프로젝트의 production_landscape도 없습니다. 보관 manifest는 2026-06-28의 2,522,788행이며 현재 집계 2,450,063행과 다릅니다. 기존 728,312패밀리·1,945,811문헌 집계와 보관 집계 스냅숏은 보존했습니다.
2. **원천 문헌 날짜의 진위:** 원천에 있는 모순을 사용자에게 표시했습니다. 63문헌 전체의 특허청 원문 재수집은 수행하지 않았습니다.
3. **외부 서비스·원천 재수집:** 공개 사이트 배포와 HTTP 전수 확인은 완료했습니다. 인증/API 수집, 원천 특허청 재조회, Drive 업로드는 실행하지 않았습니다.

## 검수 근거

아래는 이 사이트의 실제 원본·생성 코드·검증 결과입니다. 참고 문헌 수를 채우기 위한 외부 일반론을 포함하지 않았습니다.

1. [현재 후보군 스냅숏](../exports/agentbridge/agentbridge_patent_landscape_snapshot.json)
2. [대표 문헌 원본](../normalized/patents.jsonl)
3. [청구항 원본](../normalized/claims.jsonl)
4. [기존 수집 manifest](../analysis/bq_candidates_production.manifest.json)
5. [분야별 집계](../analysis/bq_summary_by_field.json)
6. [관할별 집계](../analysis/bq_summary_by_country.json)
7. [전체 집계 요약](../analysis/bq_collection_summary.json)
8. [보강 집계](../analysis/deepdive_enrichment.json)
9. [후보 선정 SQL](../sql/01a_candidate_10y_cpc_first_production.sql)
10. [심층 보강 SQL](../sql/07_deepdive_enrichment_queries.sql)
11. [탐사 분류체계와 연구 근거](../config/exploration_ds_taxonomy.json)
12. [웹 데이터 생성기](../scripts/sync-web-data.mjs)
13. [집계 생성기](../scripts/build_bq_landscape_from_candidates.mjs)
14. [출처·해시 원장](../analysis/site_data_provenance.json)
15. [데이터 검증](../logs/data_semantics_verification_20260916.json)
16. [심층 검수 기록](../logs/deepdive_audit_20260916/review.md)
17. [검색 화면](../web/app/(app)/patents/PatentSearch.tsx)
18. [그래프 계산](../web/app/lib/graph.ts)
19. [통합 내보내기](../scripts/refresh_static_site.py)
20. [정적 링크 검증기](../scripts/verify-static-site.py)
21. [도구 실패 복구 검사](../logs/site_tooling_fixture_20260916.json)
22. [공개 사이트 변경 전 HTTP 검사](../logs/site_live_baseline_20260916.json)
23. [공개 배포 전수 검사](../logs/deploy_public_verify_20260916.json)

핵심 수치의 교차 대조는 원본 스냅숏·분야별 집계·웹 생성 데이터, 원본 대표 문헌·생성 데이터·검증 스크립트, 원논문 표본·분류체계·탐사 HTML을 각각 사용했습니다. 원시 후보군 재현과는 다른 수준의 정합성 검증입니다.

세션: `/root` · 독립 검수 `/root/patent_context`, `/root/verify_materials` · 실행 모델: GPT-6 계열.
