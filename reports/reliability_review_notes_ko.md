# 신뢰성 리뷰 반영 노트

작성일: 2026-06-26

## 수정한 사항

1. `LIMIT` 편향 제거

- 미리보기용 쿼리와 프로덕션 쿼리를 분리했다.
- 프로덕션 후보/월간 쿼리는 `LIMIT`를 제거했다.
- 미리보기 파일은 분석 지표 생성에 사용하지 않도록 주석을 추가했다.

2. 패밀리 중복계상 수정

- 한국 공백/기회 산식에서 국가별 family count를 합산하지 않는다.
- 글로벌 패밀리 수는 field 단위 `COUNT(DISTINCT family_id)`로 직접 계산한다.

3. 공개국가와 출원인국가 분리

- 후보 데이터에 `publication_country_code`와 `assignee_country_codes`를 함께 저장한다.
- 국가별 활동 대시보드는 공개국가 기준이다.
- 경쟁/위협 분석은 출원인국가 기준을 보조로 사용한다.

4. 다국어 텍스트 fallback

- 제목/초록 보강 쿼리는 영어 텍스트를 우선 사용한다.
- 영어가 없으면 첫 번째 localized text로 fallback하고, language code를 보존한다.

5. 분류 신뢰성 검증 절차 추가

- 분야별 샘플 50건을 검토해 `true_positive`, `false_positive`, `wrong_field` 등을 기록한다.
- 대시보드에 확정 지표로 쓰려면 분야 precision 0.8 이상을 목표로 한다.
- 리포트의 강한 주장에는 precision 0.9 이상 또는 수동 검토가 필요하다.

6. 비용/실행 안전성 보강

- 직접 제목/초록 스캔은 정기 실행 금지로 유지한다.
- CPC-first 쿼리도 dry-run 후 `maximumBytesBilled`를 명시해야 한다.
- 월 0원 목표를 위해 BigQuery custom query quota 설정을 권장한다.

## 남은 주의점

- Google Patents Public Dataset의 legal status/current owner는 제한적이다. `grant_date`는 등록 신호일 뿐 유효 권리 판단이 아니다.
- CPC prefix는 넓은 분류라 초기에 오탐이 섞일 수 있다. 샘플 검토 후 prefix를 세분화해야 한다.
- 공개국가 기준의 CN/KR/JP 수치는 해당 국가에 공개된 문헌 수이지, 해당 국가 기업의 기술력 그 자체가 아니다.
- 한국 공백 점수는 연구기획 후보를 찾는 지표이지, 국가 역량 평가로 단정하면 안 된다.

