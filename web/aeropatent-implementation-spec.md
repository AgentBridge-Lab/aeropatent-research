# AEROPATENT 구현 설계문서

## 1. 제품 목표

`AEROPATENT`는 항공우주 분야 특허를 미국, 유럽, 일본, 중국, 한국 기준으로 분석해 보여주는 특허 인텔리전스 웹사이트다.

핵심 UX는 검색 포털이 아니라 **분석 결과를 먼저 보여주고, 사용자가 더 깊게 보고 싶을 때 검색과 원문 근거로 내려가는 구조**다.

사용자가 처음 30초 안에 알아야 하는 것:

- 어떤 항공우주 분야의 특허가 증가 중인가
- 어느 국가가 어떤 분야에서 강한가
- 최근 5년 또는 10년 동안 어떤 기술 클러스터가 떠오르는가
- 한국 입장에서 기회, 위험, 공백은 무엇인가
- 관심 분야를 클릭하면 어떤 특허와 근거가 연결되는가

## 2. 핵심 화면 원칙

1. 결론 먼저  
   첫 화면은 검색창이 아니라 분석 요약, KPI, 차트가 중심이다.

2. 그래프는 장식이 아니라 범위 선택기  
   Graph View의 노드 선택은 보고서 카드, 관련 특허 검색, 상세 보고서 생성 범위를 결정한다.

3. 보고서는 3단계로 나눈다  
   `요약 카드` → `상세 보고서` → `근거/원문`

4. 데이터는 LLM Wiki 구조로 저장한다  
   특허 문서를 그대로 저장하지 않고, 특허, 청구항, 기술요소, 국가, 출원인, 근거 chunk를 노드와 엣지로 연결한다.

5. 화면은 어둡고 차분한 항공우주 인텔리전스 도구처럼 보이되, 텍스트와 차트 가독성을 최우선으로 한다.

## 3. 사이트 메뉴와 라우트

### 3.1 좌측 고정 메뉴

```text
AEROPATENT

분석
국가 비교
Graph View
특허 검색
보고서
```

### 3.2 라우트 구조

| 라우트 | 이름 | 목적 |
|---|---|---|
| `/analysis` | 분석 홈 | 분야별, 국가별, 기간별 핵심 분석 결과를 먼저 보여준다 |
| `/analysis/:fieldId` | 상세 분석 | 특정 분야의 국가별/기간별/출원인별 분석을 보여준다 |
| `/countries` | 국가 비교 | US, EP, JP, CN, KR의 강점과 약점을 비교한다 |
| `/graph` | Graph View | LLM Wiki 기반 특허 지식 그래프를 은하수처럼 탐색한다 |
| `/patents` | 특허 검색 | 필터와 검색어로 관련 특허를 찾는다 |
| `/patents/:patentId` | 특허 상세 | 개별 특허의 초록, 청구항, 유사특허, 근거를 본다 |
| `/reports` | 보고서 목록 | 저장 또는 생성된 분석 보고서 목록 |
| `/reports/:reportId` | 상세 보고서 | 분야/국가/기간 조건에 대한 전체 보고서 |

## 4. 공통 레이아웃

### 4.1 전체 프레임

```text
┌─────────────────────────────────────────────────────────────┐
│ Left Sidebar │ Top Filter Bar                              │
│              ├──────────────────────────────────────────────┤
│              │ Main Analysis / Graph / Search Area          │
│              │                                              │
│              │                                  Right Drawer │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 좌측 사이드바

고정 폭: `240px` ~ `280px`

구성:

- 로고: `AEROPATENT`
- 메뉴
- 현재 데이터 기준일
- 전체 특허 수
- 선택된 필터 요약

모바일:

- 사이드바는 접히고 상단 햄버거 메뉴로 전환한다.

### 4.3 상단 필터 바

모든 주요 페이지에서 공유한다.

필터:

- 분야: 전체, 발사체, 위성, 탑재체, 우주통신, 항법제어, 소재·열제어
- 국가: US, EP, JP, CN, KR
- 기간: 최근 5년, 최근 10년, 전체, 직접 선택
- 검색 아이콘 또는 간단 검색 입력

상태는 URL query로 유지한다.

예:

```text
/analysis?field=satellite&countries=US,CN,KR&period=5y
/graph?field=thermal-control&colorBy=country&layout=galaxy
```

## 5. 분석 홈 `/analysis`

### 5.1 목적

사용자가 사이트에 들어오자마자 핵심 분석 결과를 이해하게 한다.

검색창보다 다음 요소가 먼저 보여야 한다.

### 5.2 화면 구성

```text
항공우주 특허 분석 리포트
최근 5년간 항공우주 특허는 위성 플랫폼, 우주통신, 재사용 발사체 분야에서 빠르게 증가하고 있습니다.

[특허 12,480] [증가율 +37%] [선도국 US] [핵심 클러스터 18]

┌ 국가별 분포 ┐ ┌ 기간별 추세 ┐ ┌ 분야 클러스터 히트맵 ┐

핵심 인사이트
1. 미국은 시스템 청구항과 인용망에서 우세
2. 중국은 최근 출원 증가 속도가 가장 빠름
3. 한국은 소재/부품 특허는 있으나 시스템 통합 특허가 상대적으로 적음
```

### 5.3 KPI 카드

필수 KPI:

| KPI | 설명 |
|---|---|
| 총 특허 수 | 현재 필터 조건의 특허 수 |
| 최근 증가율 | 기준 기간 대비 출원 증가율 |
| 선도 국가 | 특허 수와 인용/중요도 기준 최상위 국가 |
| 핵심 클러스터 수 | 의미 있는 기술 클러스터 개수 |

선택 KPI:

- 주요 출원인 수
- 평균 피인용 수
- 한국 관련 특허 수
- 공백 기술 후보 수

### 5.4 차트

1. 국가별 분포
   - 가로 막대 차트
   - US, EP, JP, CN, KR 고정 순서

2. 기간별 추세
   - 연도별 line 또는 area chart
   - 분야별 선을 너무 많이 넣지 말고 선택 분야만 강조

3. 분야 클러스터 히트맵
   - 행: 분야
   - 열: 국가
   - 색상: 특허 밀도 또는 증가율

4. 급상승 키워드
   - 작은 리스트 또는 compact bubble
   - 상위 10개 이하

## 6. 상세 분석 `/analysis/:fieldId`

### 6.1 목적

특정 분야를 선택했을 때 “왜 이 분야가 중요한지”를 빠르게 설명한다.

예시 분야:

- `launch-vehicle`
- `satellite-platform`
- `payload`
- `space-communication`
- `gnc`
- `materials-thermal`

### 6.2 화면 구성

```text
위성 열제어 특허 분석

한 줄 결론
최근 5년간 미국·중국 중심으로 출원이 증가했고, 한국은 소재/부품 단위 출원은 있으나 시스템 통합 청구항은 상대적으로 적습니다.

[특허 184건] [증가율 +37%] [선도국 US] [한국 비중 8%]

국가별 비교
기간별 추세
주요 출원인
세부기술 클러스터
핵심 인사이트
주요 특허 5개
```

### 6.3 상세 분석 내 CTA

- `Graph View에서 보기`
- `관련 특허 검색`
- `상세 보고서 생성`

## 7. 국가 비교 `/countries`

### 7.1 목적

US, EP, JP, CN, KR의 항공우주 특허 강점과 약점을 비교한다.

### 7.2 핵심 화면

```text
국가별 항공우주 특허 경쟁력

국가 선택: [US] [EP] [JP] [CN] [KR]
분야 선택: 전체 / 발사체 / 위성 / 탑재체 / 통신 / 항법제어

┌ 국가별 총량 비교 ┐
┌ 분야 x 국가 히트맵 ┐
┌ 국가별 강점 분야 순위 ┐
┌ 한국 대비 공백 영역 ┐
```

### 7.3 국가 카드

각 국가 카드는 다음을 가진다.

- 총 특허 수
- 최근 증가율
- 강점 분야 3개
- 주요 출원인 5개
- 대표 특허 3개
- 한국 대비 시사점

## 8. Graph View `/graph`

## 8.1 목적

특허, 분야, 국가, 출원인, 청구항, 키워드가 연결된 지식 구조를 은하수형 그래프로 보여준다.

이 화면은 예쁜 시각화가 아니라 **보고서 범위 선택기**다.

## 8.2 기본 레이아웃

```text
┌ Sidebar ┐ ┌───────────────────────────────────────────────┐
│ 렌즈     │ │ 검색/질문 바                                  │
│ 필터     │ │                                               │
│ 범례     │ │ 은하수형 Graph Canvas                         │
│ 그래프옵션│ │                                               │
└─────────┘ │                         ┌ Report Drawer ┐     │
            │                         │ 선택 노드 보고서 │     │
            └─────────────────────────┴───────────────┘
```

## 8.3 좌측 그래프 패널

### 렌즈

| 렌즈 | 동작 |
|---|---|
| 전체 | 모든 노드와 엣지 표시 |
| 분야별 | 분야 클러스터 중심으로 재배치 |
| 국가별 | 국가별 링 또는 클러스터로 재배치 |
| 기간별 | 연도 또는 기간 축으로 배치 |
| 출원인별 | 출원인 중심 네트워크 |
| 인용망 | cites, cited_by 관계 강조 |
| 유사특허 | similar_to 관계 강조 |

### 필터

- 분야
- 국가
- 기간
- 출원인
- IPC/CPC
- 키워드
- 중요도 점수

### 색상 기준

| 기준 | 색상 의미 |
|---|---|
| 분야 | 기술 분야별 색상 |
| 국가 | US/EP/JP/CN/KR 색상 |
| 기간 | 오래된 특허는 어둡게, 최신 특허는 밝게 |
| 출원인 | 주요 출원인별 색상 |
| 노드 유형 | patent, field, claim, applicant 등 |

### 레이아웃 모드

| 모드 | 용도 |
|---|---|
| 은하 | 기본 탐색 화면 |
| 클러스터 | 분야/국가별 묶음 확인 |
| 계층 | 분야 → 세부분야 → 특허 → 청구항 구조 확인 |
| 타임라인 | 기간별 출원 흐름 확인 |
| 인용 네트워크 | 인용/피인용 관계 확인 |

### 표시 옵션

- 라벨 보기/숨기기
- 노드 간격: 좁게 / 보통 / 넓게
- 엣지 강도 표시
- 중요 특허만 보기
- 선택 노드 주변 1-hop / 2-hop 보기

## 8.4 노드 타입

| 타입 | 예시 | 시각 표현 |
|---|---|---|
| `field` | 위성, 발사체 | 가장 큰 클러스터 노드 |
| `subfield` | 위성 열제어 | 중간 크기 노드 |
| `patent` | US2026... | 작은 별 노드 |
| `claim` | 독립항 1 | 작은 사각/점 노드 |
| `country` | US, CN, KR | 링 또는 고정 노드 |
| `applicant` | NASA, Mitsubishi 등 | 중간 노드 |
| `keyword` | thermal control | 작은 태그 노드 |
| `ipc_cpc` | B64G, H01Q | 분류 노드 |
| `report` | 생성 보고서 | 문서형 노드 |
| `evidence` | 초록/청구항 chunk | 근거 노드 |

## 8.5 엣지 타입

| 타입 | 의미 |
|---|---|
| `belongs_to` | 특허가 분야/세부분야에 속함 |
| `filed_in` | 특허가 국가에 출원됨 |
| `filed_by` | 출원인 연결 |
| `claims` | 특허와 청구항 연결 |
| `uses_keyword` | 키워드 연결 |
| `classified_as` | IPC/CPC 연결 |
| `cites` | 인용 관계 |
| `similar_to` | 유사 특허 |
| `supports_report` | 보고서 문장을 뒷받침 |
| `competes_with` | 국가/출원인/기술 간 경쟁 관계 |

## 8.6 그래프 클릭 인터랙션

### 분야 노드 클릭

예: `위성 열제어`

동작:

1. 그래프가 부드럽게 줌아웃
2. 카메라가 선택 클러스터 중심으로 이동
3. 선택 분야 주변 1-hop 노드는 밝게 표시
4. 관련 없는 노드는 15~25% opacity로 흐림
5. 오른쪽 보고서 드로어 열림

### 특허 노드 클릭

동작:

- 특허 상세 카드 열림
- 초록, 대표 청구항, 출원인, 국가, 관련 특허 표시
- `특허 상세 보기` 버튼 제공

### 국가 노드 클릭

동작:

- 해당 국가 보고서 카드 열림
- 강점 분야, 증가율, 주요 출원인, 한국 대비 시사점 표시

### 출원인 노드 클릭

동작:

- 출원인 포트폴리오 카드 열림
- 보유 분야, 주요 특허, 출원 추세 표시

## 9. 오른쪽 보고서 드로어

## 9.1 목적

그래프에서 선택한 노드에 대한 빠른 보고서를 제공한다.

드로어 폭:

- desktop: `520px` ~ `600px`
- tablet: `420px`
- mobile: full-screen bottom sheet

## 9.2 분야 보고서 카드 구조

```text
위성 열제어 특허 클러스터

최근 5년간 미국·중국 중심으로 출원이 증가.
한국은 소재·부품 단위 출원은 있으나 시스템 통합 특허는 약함.

[특허 184건] [증가율 +37%] [선도국 US] [한국 비중 8%]

국가별 분포
US ███████ 42%
CN █████ 31%
EP ███ 13%
JP ██ 6%
KR ██ 8%

기간별 추세
2021 ─ 2022 ─ 2023 ─ 2024 ─ 2025 ─ 2026

핵심 인사이트
1. 미국은 시스템 청구항이 강함
2. 중국은 최근 출원 속도가 빠름
3. 한국은 통합 제어 영역이 공백

주요 특허
1. US2026...
2. CN2025...
3. EP2024...
4. JP2023...
5. KR2023...

[관련 특허 검색] [상세 보고서]
```

## 9.3 특허 상세 카드 구조

```text
US2026-0142
Reusable launch vehicle thermal protection...

국가: US
출원인: Demo Aerospace
출원일: 2026-03-12
분야: 발사체 > 재사용 발사체

요약
재진입 열부하 완화와 착륙 제어 안정성을 결합한 특허.

대표 청구항
청구항 1: ...

관련 노드
- thermal protection
- landing control
- reusable stage

유사 특허
- EP2025...
- JP2024...

[원문 보기] [관련 특허 검색]
```

## 9.4 보고서 드로어 UX

- 드로어가 열리면 그래프는 어둡게 처리한다.
- 선택 노드는 계속 밝게 유지한다.
- 드로어 상단에는 닫기 버튼을 둔다.
- 드로어 내부 근거는 접힌 상태로 시작한다.
- `근거 보기`를 누르면 초록, 청구항, 원문 링크가 펼쳐진다.

## 10. 특허 검색 `/patents`

## 10.1 목적

분석을 보고 난 뒤 사용자가 관련 특허를 직접 확인하는 작업 공간이다.

## 10.2 검색 필터

- 검색어
- 국가: US, EP, JP, CN, KR
- 기간
- 분야
- 세부분야
- 출원인
- IPC/CPC
- 키워드
- 등록/공개 상태
- 중요도 점수
- 유사특허 포함 여부

## 10.3 검색 결과 리스트

각 결과 카드:

```text
US2026-0142
Reusable launch vehicle thermal protection...

국가 US · 2026 · 출원인 Demo Aerospace · 분야 발사체

요약 2줄

[대표 청구항 보기] [그래프에서 보기] [보고서에 추가]
```

## 10.4 검색 결과 클릭

- 오른쪽 상세 패널 또는 `/patents/:patentId`로 이동
- `그래프에서 보기` 클릭 시 `/graph?node=patent.US2026-0142`

## 11. 보고서 `/reports/:reportId`

## 11.1 목적

드로어보다 깊은 분석 보고서를 제공한다.

## 11.2 상세 보고서 목차

```text
1. Executive Summary
2. 분석 조건
3. 핵심 지표
4. 국가별 비교
5. 기간별 추세
6. 세부기술 클러스터
7. 주요 출원인
8. 주요 특허
9. 전략적 시사점
10. 근거 및 원문 링크
```

## 11.3 Executive Summary 규칙

- 3~5문장 이하
- “무엇이 증가했는가”
- “어느 국가가 강한가”
- “한국의 기회/위험/공백은 무엇인가”
- “근거는 어디에서 확인할 수 있는가”

## 11.4 인사이트 문장 형식

나쁜 예:

```text
위성 열제어 분야 특허는 증가 추세를 보이고 있습니다.
```

좋은 예:

```text
위성 열제어 특허는 2023년 이후 미국·중국에서 빠르게 늘었고,
특히 배터리 열관리와 소형위성 모듈형 방열 구조가 증가를 이끌고 있습니다.
```

더 좋은 예:

```text
한국은 소재 단위 특허는 보이지만, 위성 버스 전체 열제어 시스템을 포괄하는 청구항은 상대적으로 적어
회피설계와 공백기술 발굴 여지가 있습니다.
```

## 12. LLM Wiki 데이터 구조

## 12.1 저장 단위

문서 전체가 아니라 다음 단위로 나눈다.

- 특허 기본 정보
- 초록
- 청구항
- 기술 문제
- 해결 수단
- 기술 효과
- 인용문헌
- 출원인
- 국가
- 분야/세부분야
- evidence chunk

## 12.2 데이터 파일 또는 테이블

MVP에서는 JSONL 파일로 시작하고, 이후 DB로 옮긴다.

```text
nodes.jsonl
edges.jsonl
patents.jsonl
claims.jsonl
applicants.jsonl
evidence_chunks.jsonl
reports.jsonl
```

## 12.3 Node 스키마

```json
{
  "id": "subfield.satellite.thermal-control",
  "type": "subfield",
  "label_ko": "위성 열제어",
  "label_en": "Satellite Thermal Control",
  "field": "satellite",
  "country": null,
  "year": null,
  "importance_score": 0.91,
  "summary_ko": "위성 버스의 열 균형, 방열, 배터리 열관리 관련 기술 클러스터",
  "metadata": {}
}
```

## 12.4 Patent 스키마

```json
{
  "id": "patent.US20260142",
  "publication_number": "US2026-0142",
  "country": "US",
  "title": "Reusable launch vehicle thermal protection and landing control stack",
  "abstract_ko": "재사용 발사체의 재진입 열부하 완화와 착륙 제어 안정성을 결합한 특허.",
  "applicants": ["Demo Aerospace"],
  "filing_date": "2026-03-12",
  "publication_date": "2026-09-18",
  "fields": ["launch"],
  "subfields": ["reusable-launch-vehicle", "thermal-protection"],
  "ipc_cpc": ["B64G", "F02K"],
  "keywords": ["reusable", "thermal protection", "landing control"],
  "importance_score": 0.96,
  "source_url": "https://..."
}
```

## 12.5 Claim 스키마

```json
{
  "id": "claim.US20260142.1",
  "patent_id": "patent.US20260142",
  "claim_number": 1,
  "claim_type": "independent",
  "text": "...",
  "summary_ko": "재진입 열보호층과 착륙 제어부를 결합한 독립항",
  "key_elements": ["thermal protection layer", "landing control module"],
  "risk_score": 0.82
}
```

## 12.6 Evidence Chunk 스키마

```json
{
  "id": "evidence.US20260142.abstract.001",
  "patent_id": "patent.US20260142",
  "source_type": "abstract",
  "text": "...",
  "page": null,
  "claim_number": null,
  "language": "en",
  "citation": "US2026-0142 abstract",
  "embedding_id": "emb_..."
}
```

## 12.7 Edge 스키마

```json
{
  "from": "patent.US20260142",
  "to": "subfield.launch.reusable-launch-vehicle",
  "type": "belongs_to",
  "confidence": 0.92,
  "source": "classification_model",
  "created_at": "2026-06-20",
  "metadata": {
    "reason": "title, abstract, and claims mention reusable stage and landing control"
  }
}
```

## 13. Graph 구현 방식

## 13.1 권장 기술

MVP:

- `React`
- `Three.js`
- `@react-three/fiber`
- `d3-force-3d` 또는 자체 force layout
- 상태 관리: `zustand` 또는 React state

대안:

- 빠른 구현이면 `3d-force-graph`
- 커스텀이 중요하면 `three.js + d3-force-3d`

## 13.2 그래프 렌더링 요구사항

노드:

- 크기: importance_score 기준
- 색상: colorBy 상태 기준
- glow: 선택 또는 중요도 기준
- label: 기본은 주요 노드만 표시

엣지:

- opacity: confidence 기준
- 두께: 관계 강도 기준
- 방향성: 필요 시 작은 화살표 또는 gradient

성능:

- 기본 표시 노드 500개 이하
- 500개 초과 시 clustering 또는 level-of-detail 적용
- 라벨은 항상 모든 노드에 렌더링하지 않는다

## 13.3 Graph 상태

```ts
type GraphState = {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  lens: "all" | "field" | "country" | "period" | "applicant" | "citation" | "similar";
  layout: "galaxy" | "cluster" | "hierarchy" | "timeline" | "citation";
  colorBy: "field" | "country" | "period" | "applicant" | "nodeType";
  labelMode: "important" | "all" | "hidden";
  nodeSpacing: "compact" | "normal" | "wide";
  hopDepth: 1 | 2;
};
```

## 13.4 노드 선택 시 처리

```text
selectNode(nodeId)
  1. selectedNodeId 갱신
  2. 관련 1-hop/2-hop 노드 계산
  3. 그래프 opacity 재계산
  4. 카메라 target 좌표 계산
  5. 카메라 이동 애니메이션 실행
  6. node type에 맞는 report drawer 데이터 fetch
  7. report drawer open
```

## 14. API 설계

## 14.1 분석 요약

```http
GET /api/analysis/summary?field=satellite&countries=US,CN,KR&period=5y
```

응답:

```json
{
  "total_patents": 12480,
  "growth_rate": 37,
  "leading_country": "US",
  "cluster_count": 18,
  "country_distribution": [],
  "yearly_trend": [],
  "field_heatmap": [],
  "insights": []
}
```

## 14.2 그래프 데이터

```http
GET /api/graph?field=satellite&period=5y&countries=US,CN,KR
```

응답:

```json
{
  "nodes": [],
  "edges": []
}
```

## 14.3 노드 보고서

```http
GET /api/reports/node/:nodeId
```

응답:

```json
{
  "node_id": "subfield.satellite.thermal-control",
  "title": "위성 열제어 특허 클러스터",
  "one_line_conclusion": "...",
  "kpis": [],
  "country_distribution": [],
  "yearly_trend": [],
  "insights": [],
  "top_patents": [],
  "evidence": []
}
```

## 14.4 특허 검색

```http
GET /api/patents/search?q=thermal&field=satellite&countries=US,CN&period=5y
```

응답:

```json
{
  "total": 184,
  "items": []
}
```

## 15. 디자인 토큰

## 15.1 색상

```css
--bg: #050914;
--panel: rgba(10, 18, 32, 0.82);
--panel-soft: rgba(18, 30, 48, 0.72);
--border: rgba(220, 238, 255, 0.14);
--text: #f7fbff;
--muted: rgba(225, 238, 246, 0.68);
--cyan: #66e7ff;
--green: #88f2a8;
--amber: #ffd36a;
--red: #ff6b86;
--blue: #7fa7ff;
```

## 15.2 그래프 색상 예시

분야 기준:

| 분야 | 색 |
|---|---|
| 발사체 | cyan |
| 위성 | green |
| 탑재체 | amber |
| 우주통신 | blue |
| 항법제어 | red |
| 소재·열제어 | white/ice |

국가 기준:

| 국가 | 색 |
|---|---|
| US | cyan |
| EP | blue |
| JP | green |
| CN | red |
| KR | amber |

## 15.3 UI 규칙

- 카드 radius: `8px`
- 대시보드 카드 중첩 금지
- 큰 마케팅 히어로 금지
- 한 화면 차트는 3개 이하
- 핵심 문단은 2줄 이하
- 그래프 라벨은 기본적으로 주요 노드만 표시
- 검색은 첫 화면 주인공이 아니다

## 16. MVP 구현 순서

### Phase 1: 정적 데모

- 분석 홈 UI
- Graph View UI
- 오른쪽 보고서 드로어
- mock JSON 데이터
- 노드 클릭 → 드로어 열림

### Phase 2: 데이터 모델

- patents.jsonl
- nodes.jsonl
- edges.jsonl
- evidence_chunks.jsonl
- mock API 또는 local API

### Phase 3: 분석 기능

- 국가별 분포
- 기간별 추세
- 분야별 히트맵
- 주요 특허 추출

### Phase 4: Graph 고도화

- 렌즈 전환
- 색상 기준 전환
- 라벨 숨김
- 노드 간격
- 카메라 이동 애니메이션

### Phase 5: 검색

- 검색어
- 국가/기간/분야 필터
- 결과 리스트
- 그래프에서 보기

### Phase 6: LLM 보고서

- 선택 노드 기반 evidence 수집
- LLM 요약 생성
- 근거 링크 표시
- 보고서 저장

## 17. 구현 완료 기준

### 분석 홈

- 필터 변경 시 KPI와 차트가 갱신된다.
- 검색보다 분석 결과가 먼저 보인다.
- 사용자는 30초 안에 핵심 흐름을 이해할 수 있다.

### Graph View

- 노드 300개 이상에서도 부드럽게 탐색 가능하다.
- 분야 노드 클릭 시 해당 클러스터로 카메라가 이동한다.
- 선택 노드 주변만 강조되고 나머지는 흐려진다.
- 오른쪽 보고서 드로어가 열린다.
- 라벨 숨김, 색상 기준, 레이아웃 모드가 동작한다.

### 보고서 카드

- 한 줄 결론이 가장 먼저 보인다.
- KPI 4개가 보인다.
- 국가별 분포와 기간별 추세가 보인다.
- 인사이트 3개와 주요 특허 5개가 보인다.
- 근거는 접힌 상태로 제공된다.

### 특허 검색

- 국가, 기간, 분야, 출원인, IPC/CPC 필터가 동작한다.
- 검색 결과에서 그래프 노드로 이동할 수 있다.
- 결과 카드는 특허명보다 기술 요약을 더 읽기 쉽게 보여준다.

## 18. 첫 구현에 필요한 샘플 데이터 규모

정적 데모 기준:

- 분야 노드: 6개
- 세부분야 노드: 24개
- 특허 노드: 150~300개
- 출원인 노드: 30개
- 국가 노드: 5개
- 키워드 노드: 80개
- 청구항 노드: 100개
- 엣지: 800~1,500개

처음부터 너무 많은 데이터를 넣지 말고, 그래프가 아름답고 읽히는 수준에서 시작한다.

## 19. 핵심 구현 문장

이 제품은 “특허 검색 사이트”가 아니라 다음 문장으로 구현한다.

```text
항공우주 특허 데이터를 분야, 국가, 기간, 출원인, 청구항 단위로 연결해
사용자가 분석 결과를 먼저 읽고, 그래프에서 관심 클러스터를 선택하고,
선택한 노드의 보고서를 즉시 확인한 뒤,
필요할 때만 특허 검색과 원문 근거로 내려가는 인텔리전스 웹사이트.
```

