# BigQuery 항공우주·항공 특허 본수집 리포트

집계 산출물 생성시각: 2026-09-12T10:13:59.199Z
집계기준일: 20260912
수집일: 미확인 — 집계 생성시각을 수집일로 사용하지 않음

## 수집 범위

- 원천: Google Patents BigQuery public dataset
- 수집 방식: CPC 접두어 후보 수집. 원문 기준의 항공우주 적용 여부는 검증 전입니다.
- 기간 기준: 최근 10년 priority_date
- 분야-공보 행 (분야 간 중복 포함): 2,450,063 rows
- 공개문헌: 1,945,811 publications
- 패밀리: 728,312 families
- 분야: 9 fields
- 공개국가/관할: 73 codes

## 핵심 분야

1. 우주재료·TPS·코팅: 225,901 families, recent5 85,076, momentum 0.1784
2. GNC·랑데부·온오빗 서비스: 160,354 families, recent5 71,585, momentum 0.2265
3. 항전·비행제어·자율비행: 157,258 families, recent5 69,956, momentum 0.2243
4. 위성통신·LEO 네트워크: 140,313 families, recent5 64,174, momentum 0.2099
5. SAR·원격탐사 페이로드: 118,575 families, recent5 58,371, momentum 0.2362
6. 항공 구조·복합재·공력: 50,053 families, recent5 17,626, momentum 0.1343

## 주요 공개국가

1. 중국(CN): 510,380 families / 742,361 publications
2. 미국(US): 200,641 families / 383,741 publications
3. PCT(WO): 151,714 families / 160,312 publications
4. 유럽특허청(EP): 104,984 families / 201,687 publications
5. 한국(KR): 93,177 families / 136,856 publications
6. 일본(JP): 68,569 families / 125,247 publications
7. DE(DE): 28,834 families / 33,089 publications
8. TW(TW): 19,931 families / 32,942 publications
9. CA(CA): 14,573 families / 18,257 publications
10. AU(AU): 9,642 families / 16,502 publications

## 최근 비중과 KR 관측 비중의 탐색 점수

1. 발사체 추진·회수: publication gap score 0.2293, assignee gap score 0.231
2. SAR·원격탐사 페이로드: publication gap score 0.2164, assignee gap score 0.2189
3. GNC·랑데부·온오빗 서비스: publication gap score 0.2069, assignee gap score 0.2091
4. 항전·비행제어·자율비행: publication gap score 0.2044, assignee gap score 0.2065
5. 위성통신·LEO 네트워크: publication gap score 0.1909, assignee gap score 0.1899
6. 민간항공 추진·전기·수소·SAF: publication gap score 0.1543, assignee gap score 0.1581

## 지표의 분모와 한계

- 패밀리는 분야·공개 관할·연도에 중복 소속될 수 있습니다. 분야별·관할별 합계는 전체 고유 패밀리 수와 같지 않습니다.
- 공개 관할은 출원인 소재국이나 기술역량의 국가 분류가 아닙니다. EP는 유럽특허청, WO는 PCT 국제공개입니다.
- 최근 3년 비중은 해당 분야의 최근 3년 우선일 패밀리 수 / 전체 후보 패밀리 수입니다. 증가율이 아니며 최근 공개·수록 지연의 영향을 받습니다.
- 탐색 점수 = 최근 3년 비중 × (1 − 최근 5년 패밀리 중 KR 공개 또는 KR 소재 출원인 관측 비중). 사업 기회, 기술 부재, 자유실시 가능성을 입증하지 않습니다.
- 상위 출원인은 원천 이름별 패밀리 전수계수이며 법인 동일성 정규화가 없습니다. 수집 SQL은 공보당 첫 5개 이름·첫 20개 CPC를 보존합니다. CPC hits는 패밀리 수가 아닙니다.
- 심층 연도·피인용 자료는 별도 2016–2025 우선일 코호트입니다. 피인용은 후보 공보를 인용한 다른 패밀리 수이며 인용 관측기간·분야·연령을 정규화하지 않습니다.
- 검색·그래프의 63개 수동 선정 문헌은 별도 seed 코퍼스이며 전체 후보군의 확률표본이 아닙니다.
- 로컬 원시 스냅숏이 없으면 원집계를 재검산할 수 없습니다. 보관 수집 manifest의 행 수와 현재 집계의 일치 여부를 먼저 확인해야 합니다.

## 사용상 주의

이 리포트는 metadata-first landscape입니다. 법적 권리상태, FTO, 침해/무효 판단은 포함하지 않습니다.
제안서나 사업개발 문서에 넣을 때는 대표 패밀리의 원문, 청구항, 법적 상태를 별도 검토해야 합니다.
