# AEROPATENT 항공우주 특허분석 1차 리포트

생성일: 2026-06-20T15:36:18.828660+00:00

## 1. 결론 먼저

이번 산출물은 미국, 유럽, 일본, 중국, 한국을 포함한 공개 접근 가능 특허 문헌의 1차 시드 코퍼스다. 전체 exhaustive landscape가 아니라, 웹사이트 설계 검증과 LLM Wiki/Graph View 구현에 바로 넣을 수 있는 구조화 데이터가 목적이다.

- 전체 시드 문헌: 65건
- 대상 5개 권역 문헌: 63건
- 분류 분야: 6개
- Graph View 노드 중심축: 국가, 분야, 기술 키워드, 패밀리, 출원인, 개별 특허

## 2. 핵심 인사이트

- 초기 코퍼스는 미국 문헌 밀도가 높다: 시드 단계에서는 미국 공개문헌이 가장 많이 잡혔다. 이는 실제 우위라기보다 영어 공개문헌 접근성과 Google Patents 노출 편향이 섞인 결과로 봐야 한다.
- 최근축은 위성통신, SAR, 재사용 발사체에 몰린다: 2020년 이후 문헌이 31건으로, 서비스 화면에서는 '최근 5년' 필터를 기본값으로 두면 기술 변화가 빠르게 보인다.
- 가장 촘촘한 그래프 축은 위성 열제어/플랫폼: 초기 노드 수 기준으로 이 분야의 문헌과 키워드 연결이 가장 많다. Graph View에서는 이 필드를 은하 중심부에 두고, 국가 노드를 바깥 궤도로 배치하는 구성이 적합하다.
- 일본 데이터는 공식 재수집 우선순위: 시드 수집에서 적게 잡힌 국가는 없음이다. 특히 J-PlatPat 기반 보강이 필요하다.

## 3. 국가별 요약

- 미국(US): 15건. 주요 분야: GNC/랑데부/온오빗 서비스 3, 재사용 발사체/회수 2, 우주재료/TPS/코팅 3, SAR/원격탐사 페이로드 2, 위성 열제어/플랫폼 3, 위성통신/LEO 네트워크 2.
- 유럽(EP): 12건. 주요 분야: GNC/랑데부/온오빗 서비스 2, 재사용 발사체/회수 2, 우주재료/TPS/코팅 2, SAR/원격탐사 페이로드 2, 위성 열제어/플랫폼 2, 위성통신/LEO 네트워크 2.
- 일본(JP): 11건. 주요 분야: GNC/랑데부/온오빗 서비스 2, 재사용 발사체/회수 1, 우주재료/TPS/코팅 2, SAR/원격탐사 페이로드 2, 위성 열제어/플랫폼 2, 위성통신/LEO 네트워크 2.
- 중국(CN): 15건. 주요 분야: GNC/랑데부/온오빗 서비스 3, 재사용 발사체/회수 2, 우주재료/TPS/코팅 3, SAR/원격탐사 페이로드 1, 위성 열제어/플랫폼 3, 위성통신/LEO 네트워크 3.
- 한국(KR): 10건. 주요 분야: GNC/랑데부/온오빗 서비스 1, 재사용 발사체/회수 1, 우주재료/TPS/코팅 1, SAR/원격탐사 페이로드 3, 위성 열제어/플랫폼 2, 위성통신/LEO 네트워크 2.

## 4. 분야별 요약

- 재사용 발사체/회수: 8건. 국가 분포: CN 2, EP 2, JP 1, KR 1, US 2.
- 위성 열제어/플랫폼: 12건. 국가 분포: CN 3, EP 2, JP 2, KR 2, US 3.
- 위성통신/LEO 네트워크: 11건. 국가 분포: CN 3, EP 2, JP 2, KR 2, US 2.
- SAR/원격탐사 페이로드: 10건. 국가 분포: CN 1, EP 2, JP 2, KR 3, US 2.
- GNC/랑데부/온오빗 서비스: 11건. 국가 분포: CN 3, EP 2, JP 2, KR 1, US 3.
- 우주재료/TPS/코팅: 11건. 국가 분포: CN 3, EP 2, JP 2, KR 1, US 3.

## 5. 대표 문헌

- EP3329612B1 (EP, 2025): Flexible capacity satellite constellation
- JP7603675B2 (JP, 2024): Hybrid propulsion systems for spacecraft
- KR102742715B1 (KR, 2024): Solar, electronic, RF radiator for self-contained structures for space-based arrays
- KR102876480B1 (KR, 2025): High resolution wide swath synthetic aperture radar system
- CN107848635B (CN, 2021): Satellite radiator panel with combined reinforcing sheet/heat pipe
- CN109417827B (CN, 2020): Low earth orbit satellite constellation system and method of use
- EP4143990A2 (EP, 2023): Edge computing in satellite connectivity environments
- JP6763875B2 (JP, 2020): Artificial satellite heat dissipation panel with combined reinforcement / heat pipe

## 6. 웹사이트 표시 방식

첫 화면은 검색창보다 분석 결과를 먼저 보여주는 것이 좋다. 상단 KPI에는 전체 시드 문헌 수, 최근 2020년 이후 문헌 수, 가장 밀집된 분야, 보강이 필요한 국가를 표시한다. 그 아래에는 분야별 카드 6개를 배치하고, 사용자가 카드를 누르면 오른쪽 보고서 드로어가 열린다.

Graph View는 분야 노드를 중심 성단으로 두고 국가 노드를 바깥 궤도에 둔다. 개별 특허는 별 입자처럼 작게 배치하고, family_id가 있는 문헌은 같은 중력권으로 묶는다. 사용자가 'SAR/원격탐사' 같은 분야를 누르면 카메라가 해당 성단으로 이동하고 오른쪽 카드에는 대표 문헌, 국가 분포, 최근 문헌, 핵심 키워드를 보여준다.

## 7. LLM Wiki 저장 전략

- `normalized/patents.jsonl`: 특허 한 건당 하나의 문서. 필터, 리스트, 상세 페이지의 기본 데이터.
- `normalized/evidence_chunks.jsonl`: 초록, 청구항 발췌, UI 요약을 chunk로 분리. LLM 검색/RAG 입력.
- `graph/nodes.jsonl`, `graph/edges.jsonl`: 3D 그래프 렌더링과 클릭 이동의 직접 입력.
- `reports/site_report_cards.json`: 분석 홈과 오른쪽 보고서 카드의 직접 입력.

## 8. 한계와 다음 단계

이번 데이터는 Google Patents 페이지를 기반으로 만든 공개 접근 시드다. 권리 존속, 법적 상태, 최신 공개 여부는 공식 원천으로 재검증해야 한다. 생산 단계에서는 USPTO ODP, EPO OPS, KIPRIS Plus, J-PlatPat, CNIPA를 국가별 source-of-record로 붙이고, 동일 스키마에 다시 적재하면 된다.

