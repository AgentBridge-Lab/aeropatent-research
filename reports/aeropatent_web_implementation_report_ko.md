# AeroPatent 웹사이트 구현 성과물 보고서

항공우주 특허 분석 데모를 “인터랙티브 히어로 → 분석 대시보드 → 그래프 탐색 → 특허/보고서 상세” 흐름으로 재구성하고, 기존에 구축한 MCP/BigQuery 기반 특허 데이터 스냅샷을 웹사이트에서 사용할 수 있는 정적 데이터 계층으로 연결했다.

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| 프로젝트 | AeroPatent Research |
| 작업일 | 2026-07-03 |
| 저장소 | `C:\Users\ldh\Workspace\aeropatent-research` |
| 웹 앱 위치 | `C:\Users\ldh\Workspace\aeropatent-research\web` |
| GitHub Pages 산출물 | `C:\Users\ldh\Workspace\aeropatent-research\docs` |
| 데이터 원천 | `exports/agentbridge/agentbridge_patent_landscape_snapshot.json`, `normalized/*.jsonl` |
| 배포 상태 | 정적 빌드와 검증 완료, 커밋/푸시는 사용자 요청으로 일시 중단 |

## 01. 존재 이유

기존 데모는 사용자가 의도한 특허 분석 사이트가 아니라 공고 크롤링 사이트에 가까웠다. 이번 작업의 목적은 사용자가 처음 설계했던 구조, 즉 Spline 인터랙션 히어로를 첫 화면에 단독 배치하고, 사용자가 진입을 선택했을 때만 특허 분석 화면으로 들어가는 경험을 복원하는 것이다.

이 사이트는 단순 검색 페이지가 아니라 항공우주 분야의 특허 지형을 빠르게 이해하기 위한 분석 인터페이스다. 사용자는 먼저 분야별, 국가별, 기간별 전체 동향을 보고, 필요할 때만 관련 특허 검색과 상세 보고서로 내려간다.

## 02. 핵심 결과

| 결과물 | 설명 |
| --- | --- |
| Spline 히어로 | 첫 화면 전체를 인터랙티브 3D 히어로로 구성하고, 클릭 시 `/analysis`로 진입 |
| 분석 대시보드 | 항공우주 특허를 분야별, 국가별, 기간별로 요약 표시 |
| 국가 비교 화면 | 미국, 유럽, 일본, 중국, 한국 기준의 특허 분포와 강점 분야 비교 |
| 3D 그래프 뷰 | LLM wiki/Obsidian graph view에 가까운 노드 탐색 구조 |
| 특허 검색 화면 | 대표 특허 문헌을 키워드, 분야, 국가, 중요도 기준으로 탐색 |
| 보고서 화면 | 분야/국가/특허 단위로 보고서 카드형 상세 정보 제공 |
| MCP 데이터 연동 구조 | MCP/BigQuery 수집 결과를 정적 웹 데이터로 변환하는 동기화 스크립트 구현 |

## 03. 정보 구조

사이트는 정보 과부하를 줄이기 위해 “요약 먼저, 검색은 나중” 구조로 설계했다.

1. `/`  
   Spline 히어로만 보여준다. 사용자가 `Explore Data`를 누르거나 히어로를 클릭하면 분석 화면으로 이동한다.

2. `/analysis`  
   전체 특허 지형을 먼저 보여준다. 핵심 KPI, 분야별 카드, 연도별 흐름, 국가별 분포, 주요 인사이트를 배치한다.

3. `/analysis/[fieldId]`  
   특정 기술 분야의 상세 분석을 보여준다. 예: 발사체·추진·회수, 우주통신·LEO 네트워크, 항공전자·비행제어·자율운항.

4. `/countries`  
   미국, 유럽, 일본, 중국, 한국을 비교한다. 사용자는 어느 국가가 어느 분야에서 강한지 빠르게 파악할 수 있다.

5. `/graph`  
   분야, 세부분야, 특허, 출원인 노드를 연결한 3D 그래프 뷰다. 사용자가 노드를 선택하면 해당 맥락으로 이동하거나 오른쪽 보고서 패널을 열 수 있는 구조다.

6. `/patents` 및 `/patents/[patentId]`  
   대표 특허 검색과 상세 문헌 확인용 화면이다.

7. `/reports` 및 `/reports/[reportId]`  
   분석 결과를 보고서 카드 형태로 정리한다. 연구기획용, 사업개발용으로 재가공하기 쉬운 구조다.

## 04. 데이터 모델

웹사이트는 실시간 API 호출이 아니라 정적 스냅샷 기반으로 동작한다. GitHub Pages에서도 비용 없이 배포할 수 있도록 하기 위한 결정이다.

| 계층 | 역할 |
| --- | --- |
| BigQuery/Google Patents | 항공우주 특허 후보군 수집 및 메타 분석 |
| MCP 서버 | 수집된 특허 지식을 도구 형태로 조회할 수 있는 인터페이스 |
| 정규화 데이터 | `normalized/patents.jsonl`, `normalized/claims.jsonl` |
| 웹 데이터 생성기 | `scripts/sync-web-data.mjs` |
| 웹 앱 데이터 계층 | `web/app/lib/data.ts` |
| 정적 배포 결과 | `docs/` |

현재 웹 빌드에 반영된 데이터 규모는 다음과 같다.

| 지표 | 값 |
| --- | ---: |
| 분석 분야 | 9개 |
| 대표 특허 | 63건 |
| 세부분야 노드 | 50개 |
| 정적 생성 페이지 | 157개 |
| 대상 국가 | 미국, 유럽, 일본, 중국, 한국 |

## 05. 분야 분류

항공우주 전체를 우주 분야와 민간/상용항공 분야로 나누고, 웹에서 바로 읽히는 한국어 라벨과 보고서 문구를 별도로 정리했다.

| 분야 ID | 표시명 |
| --- | --- |
| `space_launch_propulsion_recovery` | 발사체·추진·회수 |
| `space_satellite_bus_thermal_power` | 위성체·열·전력 |
| `space_comm_leo_network` | 우주통신·LEO 네트워크 |
| `space_remote_sensing_payload` | 원격탐사·탑재체 |
| `space_gnc_rendezvous_servicing` | GNC·랑데부·서비스 |
| `space_materials_tps_coatings` | 우주재료·TPS·코팅 |
| `aviation_propulsion_sustainable` | 민간/상용항공 추진·SAF |
| `aviation_structures_aero_composites` | 항공 구조·공력·복합재 |
| `aviation_avionics_flight_control_autonomy` | 항공전자·비행제어·자율운항 |

## 06. 구현 과정

### 작업 1. 원형 사이트 복원

사용자가 크롬에서 열어 둔 `http://127.0.0.1:3002/analysis`가 의도한 특허 분석 사이트임을 확인했다. 이 프로젝트는 `C:\Users\ldh\Downloads\distorting_typography`에 있었고, Spline 히어로와 특허 분석 라우팅이 이미 포함되어 있었다.

### 작업 2. GitHub Pages 데모 교체 준비

기존 GitHub Pages 데모 저장소인 `C:\Users\ldh\Workspace\aeropatent-research` 안에 새 웹 앱을 `web/` 디렉터리로 이관했다. 기존 `docs/`는 배포 산출물 전용으로 사용하도록 정리했다.

### 작업 3. 정적 배포 설정

Next.js 앱을 GitHub Pages에 올릴 수 있도록 `next.config.js`에 다음 조건을 반영했다.

- `output: 'export'`
- `trailingSlash: true`
- GitHub Pages용 `basePath: '/aeropatent-research'`
- 정적 이미지 경로 보정
- `.nojekyll` 생성

### 작업 4. 데이터 동기화 스크립트 구현

`scripts/sync-web-data.mjs`를 추가해 MCP/BigQuery 기반 데이터 스냅샷을 웹 앱에서 바로 import할 수 있는 TypeScript 데이터 파일로 변환했다.

중요한 구조 변경은 `docs/data/site-data.json`을 원천 데이터로 쓰지 않도록 한 것이다. `docs/`는 배포 산출물이라 빌드 때 매번 덮어써진다. 따라서 원천은 `exports/agentbridge/agentbridge_patent_landscape_snapshot.json`으로 옮겼다.

### 작업 5. 정적 라우트 보강

GitHub Pages는 서버 런타임이 없으므로 동적 상세 페이지를 모두 사전에 생성해야 한다. 다음 라우트에 `generateStaticParams`를 추가했다.

- `/analysis/[fieldId]`
- `/patents/[patentId]`
- `/reports/[reportId]`

### 작업 6. 보안 및 의존성 정리

Next.js와 React를 최신 안정 조합으로 올리고, PostCSS 취약점 경고를 `overrides`로 해소했다.

| 검증 항목 | 결과 |
| --- | --- |
| TypeScript 타입 체크 | 통과 |
| `npm audit --omit=dev` | 취약점 0건 |
| 비밀키 문자열 스캔 | 실제 키/토큰 없음 |
| GitHub Pages 경로 검사 | 통과 |
| 정적 HTTP 응답 검사 | 루트, 분석, 그래프, 로고, JS 자산 모두 200 |

## 07. MCP 활용 방식

MCP는 웹사이트의 실시간 서버 역할이 아니라, 특허 수집·정규화·분석 과정에서 생성된 지식 저장소와 조회 도구 역할을 한다. 웹사이트는 공개 데모이므로 GitHub Pages에서 정적 파일만 제공하고, MCP 데이터는 빌드 시점에 정적 데이터로 스냅샷화한다.

이 구조의 장점은 다음과 같다.

- 공개 데모에서 API 키가 노출되지 않는다.
- 월 비용 0원 조건을 유지할 수 있다.
- MCP/BigQuery 수집 파이프라인을 갱신하면 웹 데이터도 재생성할 수 있다.
- 나중에 서버형 제품으로 확장할 때 MCP를 검색/질의 백엔드로 그대로 재사용할 수 있다.

## 08. 그래프 뷰 설계

그래프 뷰는 Obsidian graph view와 LLM wiki의 중간 형태로 설계한다.

| 노드 | 의미 |
| --- | --- |
| 분야 노드 | 9개 핵심 항공우주 기술 분야 |
| 세부분야 노드 | 각 분야의 세부 기술 클러스터 |
| 특허 노드 | 대표 특허 문헌 |
| 출원인 노드 | 주요 기업·기관 |
| 키워드 노드 | 반복 등장하는 기술 키워드 |

사용자 경험은 다음 흐름을 목표로 한다.

1. 은하수처럼 흩어진 입자형 그래프를 보여준다.
2. 사용자가 분야 노드를 클릭한다.
3. 카메라가 해당 노드로 부드럽게 이동한다.
4. 연결된 세부분야와 대표 특허가 강조된다.
5. 오른쪽 보고서 카드가 펼쳐진다.
6. 카드에서 상세 분석 페이지나 특허 검색으로 이동한다.

## 09. 현재 상태

현재 구현은 로컬에서 정적 빌드와 검증까지 완료된 상태다. 다만 사용자가 “이따가 하고 지금 급해”라고 요청했기 때문에 Git 커밋과 GitHub 푸시는 진행하지 않았다.

완료된 작업은 다음과 같다.

- 올바른 특허 분석 웹사이트 원형 확인
- `aeropatent-research/web`로 웹 앱 이관
- MCP/BigQuery 데이터 동기화 구조 구현
- 9개 항공우주 분야 라벨 및 보고서 문구 정리
- GitHub Pages용 정적 export 설정
- `docs/` 배포 산출물 생성
- 타입 체크, 빌드, 보안 감사, HTTP 검증 완료

남은 작업은 다음과 같다.

- 최종 브라우저 시각 검수
- 불필요한 검증 이미지 정리 여부 결정
- 변경사항 커밋
- GitHub 원격 저장소 푸시
- GitHub Pages 반영 확인

## 10. 보고용 요약 문장

이번 구현에서는 항공우주 특허 분석 서비스를 단순 검색 페이지가 아니라 시각적 진입점과 분석 중심 대시보드로 재설계했다. 첫 화면은 Spline 기반 인터랙티브 히어로로 구성하고, 진입 후에는 분야별·국가별·기간별 특허 동향, 관련 특허 검색, 보고서 카드, 3D 그래프 뷰를 순차적으로 탐색할 수 있게 했다. 또한 기존 MCP/BigQuery 특허 수집 결과를 정적 웹 데이터로 변환하는 파이프라인을 구현해, API 키 노출 없이 GitHub Pages에서 비용 없이 배포 가능한 구조를 마련했다.

## 11. 다음 실행

배포를 재개할 때는 다음 순서로 진행하면 된다.

```powershell
cd C:\Users\ldh\Workspace\aeropatent-research\web
$env:GITHUB_PAGES="true"
npm run build:pages
```

그 다음 `web/out`을 `docs/`로 복사하고, 저장소 루트에서 커밋 후 푸시한다.

```powershell
cd C:\Users\ldh\Workspace\aeropatent-research
git status --short
git add -A
git commit -m "Replace Pages demo with AeroPatent analysis site"
git push origin main
```

