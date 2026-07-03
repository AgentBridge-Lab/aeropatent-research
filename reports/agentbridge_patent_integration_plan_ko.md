# AgentBridge 특허 코퍼스 연계 보강 기획

작성일: 2026-06-28

## 목적

항공우주 특허 분석 프로젝트에서 수집한 특허 정보를 AgentBridge의 공고 탐색, NASA Technology Taxonomy 분류, 관련 특허 동향, 기술융합 맵, 제안서 초안 생성에 재사용한다.

핵심 원칙은 다음과 같다.

- 특허 데이터는 사람에게는 요약 카드와 근거 표로 보여준다.
- LLM에게는 MCP 도구와 evidence pack 형태로 제공한다.
- 공고, 논문, 저자, 특허는 NASA 2024 Technology Taxonomy를 공통 분류축으로 연결한다.
- BigQuery/KIPRIS는 수집 단계에서만 사용하고, AgentBridge는 정규화된 로컬 스냅샷 또는 MCP 서버를 조회한다.

## 추가 데이터 산출물

```text
config/nasa_technology_taxonomy_2024_core.json
config/agentbridge_patent_taxonomy_crosswalk.json
normalized/patents.jsonl
normalized/evidence_chunks.jsonl
analysis/bq_field_region_period_metrics.json
reports/site_report_cards.json
reports/agentbridge_program_evidence_packs/*.json
graph/nodes.jsonl
graph/edges.jsonl
```

## AgentBridge용 evidence pack

```ts
type ProgramPatentEvidencePack = {
  programId: string;
  queryTopic: string;
  taxonomyVersion: "NASA_2024";
  nasaTaxonomy: NasaTaxonomyMatch[];
  generatedQueries: string[];
  patentTrendSummary: string;
  countryTrend: Record<string, number>;
  periodTrend: {
    tenYear: string;
    fiveYear: string;
    threeYearEmerging: string;
    twelveMonthWatch: string;
  };
  topApplicants: string[];
  topCpcOrIpc: string[];
  representativePatents: PatentReference[];
  opportunityNotes: string[];
  riskNotes: string[];
  proposalReadyBullets: string[];
  evidenceIds: string[];
  limitations: string[];
};
```

## MCP 도구 설계

```text
search_patents_by_nasa_taxonomy
- 입력: txCode, keyword, country, dateWindow, limit
- 출력: 관련 특허 목록과 근거 청크

get_patent_landscape_for_program
- 입력: programId 또는 topic
- 출력: 공고 상세페이지 특허 동향 패널용 요약

get_taxonomy_crosswalk
- 입력: aeropatentFieldId 또는 txCode
- 출력: 특허 분야, NASA TX, AgentBridge 검색어 매핑

get_proposal_evidence_pack
- 입력: programId 또는 topic
- 출력: 제안서 초안에 넣을 특허 근거 묶음

get_graph_neighbors
- 입력: nodeId, depth, nodeTypes
- 출력: 공고, TX, 특허, 논문, 저자 연결 그래프
```

## 화면 반영

공고 상세페이지의 특허 동향은 아래 순서로 보여준다.

1. 공고와 연결된 NASA TX 배지
2. 3문장 특허 동향 요약
3. 국가/기간별 미니 차트
4. 주요 출원인과 대표 특허
5. 제안서 반영 문장
6. 해석 주의사항과 근거 데이터

## 검증 기준

- 공고별 대표 특허는 최소 5건 이상 확인한다.
- 제안서에 들어가는 강한 문장은 evidence chunk를 반드시 가진다.
- 분야별 분류 precision은 샘플 50건 기준 80% 이상을 목표로 한다.
- 한국 기회/공백 판단은 공개국가 기준과 출원인 국가 기준을 분리해 설명한다.
