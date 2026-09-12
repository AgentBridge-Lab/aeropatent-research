import type { Field, FieldId, Subfield } from './data';

interface FieldGuidance {
  technologyAxes: string[];
  decisionQuestions: string[];
}

const FIELD_GUIDANCE: Record<FieldId, FieldGuidance> = {
  space_launch_propulsion_recovery: {
    technologyAxes: [
      '발사체 구조, 추진기관, 재사용·회수 계통을 분리해 청구항의 결합 관계를 확인합니다.',
      '수직 착륙과 해상 회수처럼 운용 시나리오가 다른 기술은 별도 검색축으로 비교합니다.',
      '엔진·추진제·회수장치의 부품 공급망과 시스템 통합 권리를 함께 추적합니다.',
    ],
    decisionQuestions: [
      '연구개발 과제가 기존 시스템 청구항과 겹치는 구성요소는 무엇인가?',
      '재사용 운용에서 별도 권리화가 필요한 회수·점검·재비행 단계는 무엇인가?',
      '원문 청구항과 수출통제·안전 요구사항을 함께 검토해야 할 기술은 무엇인가?',
    ],
  },
  space_satellite_bus_thermal_power: {
    technologyAxes: [
      '위성 버스, 전력계, 열제어계를 기능과 인터페이스 기준으로 분리합니다.',
      '라디에이터·루버·히트파이프 등 수동 열제어와 능동 열제어를 구분해 비교합니다.',
      '소형위성 적용 시 질량·전력·열 안정성의 상충관계를 청구항 단위로 확인합니다.',
    ],
    decisionQuestions: [
      '버스 공통기술과 임무별 탑재체 인터페이스 중 어느 부분을 독립 권리화할 것인가?',
      '열·전력·구조를 함께 묶은 시스템 청구항에서 회피 설계 가능한 경계는 어디인가?',
      '실증 임무 전에 원문과 시험조건을 우선 검토해야 할 구성품은 무엇인가?',
    ],
  },
  space_comm_leo_network: {
    technologyAxes: [
      '저궤도 위성군, 위성 간 링크, 지상국 연동을 네트워크 계층별로 구분합니다.',
      '빔포밍·주파수 재사용·핸드오버를 장비 기능과 운용 로직으로 나눠 추적합니다.',
      '단말·위성·게이트웨이의 역할 분담이 청구항에 어떻게 배치되는지 확인합니다.',
    ],
    decisionQuestions: [
      '서비스 구조와 단말·탑재체 기술 중 핵심 차별점이 위치하는 계층은 어디인가?',
      '표준·주파수 정책과 함께 검토해야 할 특허 묶음은 무엇인가?',
      '위성군 확장 시 새롭게 발생하는 링크 관리·라우팅 권리 이슈는 무엇인가?',
    ],
  },
  space_remote_sensing_payload: {
    technologyAxes: [
      '광학·레이더 센서, 탑재체 제어, 영상처리를 수집부터 활용까지의 흐름으로 구분합니다.',
      'SAR 하드웨어와 영상 형성·보정 알고리즘을 별도 기술축으로 비교합니다.',
      '온보드 처리와 지상 분석의 기능 분담이 청구항에 미치는 영향을 확인합니다.',
    ],
    decisionQuestions: [
      '센서 구성과 데이터 처리 중 사업 경쟁력을 좌우하는 권리 축은 무엇인가?',
      '탑재체와 분석 소프트웨어를 하나의 시스템으로 권리화할 필요가 있는가?',
      '원시데이터·보정·융합 단계별로 추가 조사가 필요한 기술은 무엇인가?',
    ],
  },
  space_gnc_rendezvous_servicing: {
    technologyAxes: [
      '유도·항법·제어, 근접운용, 랑데부·도킹을 임무 단계별로 분리합니다.',
      '센서융합과 자율제어 로직, 안전 감시 기능의 결합 관계를 확인합니다.',
      '궤도상 서비스 임무에서 목표물 특성과 접촉·비접촉 작업을 구분해 비교합니다.',
    ],
    decisionQuestions: [
      '자율화 수준별로 새롭게 필요한 센서·제어 청구항은 무엇인가?',
      '비협조 표적 접근과 도킹 단계에서 우선 검증할 안전 기능은 무엇인가?',
      '시험환경과 실제 궤도 운용조건의 차이를 어떻게 특허 해석에 반영할 것인가?',
    ],
  },
  space_materials_tps_coatings: {
    technologyAxes: [
      '소재 조성, 제조 공정, 적용 부품을 분리해 열보호·코팅 권리를 비교합니다.',
      '삭마재·세라믹·복합재·단열재의 성능지표와 시험조건을 함께 확인합니다.',
      '재사용 환경에서 수리·검사·수명평가 기술을 별도 축으로 추적합니다.',
    ],
    decisionQuestions: [
      '조성 범위와 공정조건 중 권리범위를 좌우하는 핵심 변수는 무엇인가?',
      '부품 적용 특허와 범용 소재 특허를 어떤 기준으로 분리할 것인가?',
      '성능 주장과 실시예·시험조건이 일치하는지 추가 검증할 문헌은 무엇인가?',
    ],
  },
  aviation_propulsion_sustainable: {
    technologyAxes: [
      '가스터빈 효율, 하이브리드·전기추진, 수소·SAF 적용을 동력원별로 구분합니다.',
      '엔진 코어, 연소기, 전력변환·열관리 등 시스템 경계를 나눠 비교합니다.',
      '기체 통합과 연료·에너지 공급망에 걸친 권리 주체를 함께 추적합니다.',
    ],
    decisionQuestions: [
      '기존 엔진 개량과 신규 전동화 구성 중 독립 권리화할 기술은 무엇인가?',
      '연료 전환이 연소·저장·안전 계통의 청구항에 미치는 영향은 무엇인가?',
      '인증과 공급망을 고려할 때 우선 협력 또는 회피 검토할 출원인은 누구인가?',
    ],
  },
  aviation_structures_aero_composites: {
    technologyAxes: [
      '날개·동체·조종면 등 기체 구조와 공력 형상, 복합재 제조를 별도 축으로 분석합니다.',
      '적층·성형·접합·수리·비파괴검사를 복합재 수명주기 단계별로 구분합니다.',
      '경량화와 하중 전달, 공력 성능의 상충관계를 구성요소와 공정 청구항에서 확인합니다.',
    ],
    decisionQuestions: [
      '형상 설계와 제조 공정 중 차별성이 실제로 권리화된 지점은 어디인가?',
      '복합재 수리·검사 기술을 제작 단계와 운항 유지보수 단계로 어떻게 나눌 것인가?',
      '인증 하중조건과 실제 적용 부위를 원문에서 우선 확인할 문헌은 무엇인가?',
    ],
  },
  aviation_avionics_flight_control_autonomy: {
    technologyAxes: [
      '항공전자, 비행제어, 자율비행을 센서·판단·제어·감시 기능으로 구분합니다.',
      '유인기 보조시스템과 무인기·AAM 자율운항의 안전 구조를 별도로 비교합니다.',
      '센서융합·경로계획·충돌회피 소프트웨어와 탑재 하드웨어의 결합 관계를 확인합니다.',
    ],
    decisionQuestions: [
      '자율화 수준별로 사람이 담당하던 기능이 어떤 청구항으로 전환되는가?',
      '안전성 보증과 고장대응 로직 중 우선적으로 검증할 권리 축은 무엇인가?',
      '항공 인증자료·표준과 특허 청구범위를 함께 비교해야 할 기능은 무엇인가?',
    ],
  },
};

const SUBFIELD_FOCUS: Record<string, string> = {
  'aviation_avionics_flight_control_autonomy__flight-control': '제어법칙, 조종면·추력 명령, 고장 허용 제어와 비행영역 보호의 결합 관계를 검토합니다.',
  'aviation_avionics_flight_control_autonomy__autonomous-flight': '인지·상황판단·경로계획·자동복구와 조종사 개입 전환 조건을 기능별로 구분합니다.',
  'aviation_avionics_flight_control_autonomy__avionics': '통합 모듈형 항공전자, 데이터버스, 이중화·분리 구조와 인증 가능한 소프트웨어 경계를 확인합니다.',
  'aviation_avionics_flight_control_autonomy__core': '센서-연산-작동기-안전감시로 이어지는 항공전자·자율제어 전체 구조를 분석합니다.',
  'aviation_propulsion_sustainable__sustainable-aviation-fuel': '연료 조성·제조, 기존 엔진 연소 적합성, 저장·이송 소재와 배출 저감 효과의 권리 경계를 봅니다.',
  'aviation_propulsion_sustainable__hybrid-electric': '전기모터·인버터·배터리와 터빈의 동력 분배, 에너지 관리, 열관리·고장 대응을 함께 검토합니다.',
  'aviation_propulsion_sustainable__aircraft-propulsion': '팬·압축기·연소기·터빈·노즐의 효율 개선과 기체 장착·흡배기 통합 기술을 구분합니다.',
  'aviation_propulsion_sustainable__core': '가스터빈, 전기추진, 연료전환을 동력원·에너지저장·기체 통합의 세 축으로 비교합니다.',
  'aviation_structures_aero_composites__aerodynamics': '양력·항력, 유동제어, 공탄성 및 형상 최적화가 구조·조종면 설계와 연결되는 지점을 검토합니다.',
  'aviation_structures_aero_composites__aircraft-structure': '날개·동체의 하중경로, 체결·접합부, 손상허용과 좌굴·피로 수명 관련 구성을 확인합니다.',
  'aviation_structures_aero_composites__composite': '적층·수지·성형·경화 조건과 접합·수리·비파괴검사까지 복합재 수명주기 권리를 분석합니다.',
  'aviation_structures_aero_composites__core': '기체 하중전달, 공력 형상, 복합재 제조와 인증 시험조건의 상호작용을 통합적으로 봅니다.',
  'space_comm_leo_network__beamforming': '위상배열 급전, 빔 조향·보정, 간섭 억제와 사용자별 자원 할당 로직을 구분합니다.',
  'space_comm_leo_network__core': '위성 탑재체-사용자 단말-게이트웨이 사이 링크 관리와 네트워크 운용 권리를 분석합니다.',
  'space_comm_leo_network__inter-satellite-link': '광·RF 링크의 포착·추적, 동기화, 라우팅과 링크 단절 복구 절차를 확인합니다.',
  'space_comm_leo_network__satellite-communication': '변복조·부호화, 주파수 재사용, 링크 적응과 지상망 연동의 기능 배치를 검토합니다.',
  'space_comm_leo_network__leo-network': '고속 이동 위성 간 핸드오버, 라우팅, 게이트웨이 선택과 주파수 자원 관리를 분석합니다.',
  'space_comm_leo_network__leo-satellite-constellation': '궤도면 배치, 위성 간 협조, 용량 배분과 서비스 연속성 유지 로직을 구분합니다.',
  'space_gnc_rendezvous_servicing__gnc-rpo': '상대항법·접근 유도·자세제어와 근접운용 안전감시를 임무 단계별로 분석합니다.',
  'space_gnc_rendezvous_servicing__proximity-operation': '상대 위치·속도 추정, 접근 금지영역, 충돌회피와 안전 중단 조건을 검토합니다.',
  'space_gnc_rendezvous_servicing__docking': '정렬·포획·구속·하중 완화 장치와 도킹 후 전력·데이터·유체 인터페이스를 확인합니다.',
  'space_gnc_rendezvous_servicing__rendezvous': '궤도전이, 접근 회랑, 상대항법과 단계별 유도·제어 전환 조건을 분석합니다.',
  'space_gnc_rendezvous_servicing__gnc': '센서융합·상태추정, 유도명령 생성, 제어기와 고장 검출·재구성 기능을 구분합니다.',
  'space_gnc_rendezvous_servicing__attitude-control': '반작용휠·CMG·추력기 제어, 모멘텀 관리와 정밀 지향 성능의 권리 구성을 봅니다.',
  'space_launch_propulsion_recovery__rocket-engine': '인젝터·연소실·터보펌프·노즐·냉각계의 구성과 시동·정지 시퀀스를 분석합니다.',
  'space_launch_propulsion_recovery__launch-vehicle': '단분리, 구조 하중경로, 추진·항전 통합과 지상-비행 운용 인터페이스를 검토합니다.',
  'space_launch_propulsion_recovery__core': '발사체 구조, 추진기관, 유도제어와 회수·재비행 절차의 시스템 결합을 분석합니다.',
  'space_launch_propulsion_recovery__vertical-landing': '추력 조절, 착륙 유도, 착륙장 위험 인지와 랜딩기어·완충 구조를 확인합니다.',
  'space_launch_propulsion_recovery__reusable-launch-vehicle': '회수 비행, 착륙, 상태점검·정비와 재비행 판정까지 재사용 운용주기를 검토합니다.',
  'space_launch_propulsion_recovery__propulsion': '추진제 공급·가압, 점화, 추력 제어, 열관리와 추진계 상태감시를 구분합니다.',
  'space_launch_propulsion_recovery__sea-landing': '해상 목표점 항법, 부유·이동 플랫폼 보정, 염수 환경과 회수 후 안전조치를 분석합니다.',
  'space_launch_propulsion_recovery__rocket-recovery': '재진입·감속·착륙 또는 포획, 위치 회수와 재사용 점검 기술을 단계별로 봅니다.',
  'space_materials_tps_coatings__coating': '코팅 조성, 증착·도포 공정, 기재 접착력과 원자산소·침식·열화 저항을 확인합니다.',
  'space_materials_tps_coatings__ablative-material': '삭마재의 조성·밀도·열분해 거동과 열유속 조건별 질량 손실, 잔탄층 안정성을 비교합니다.',
  'space_materials_tps_coatings__rocket-motor-insulation': '라이너·단열재 조성, 추진제·케이스 접착, 삭마·균열과 장기 저장 열화를 검토합니다.',
  'space_materials_tps_coatings__spacecraft-coating': '우주비행체 코팅의 기재 접착, 열광학 특성, 원자산소·자외선·대전 환경 내구성을 분석합니다.',
  'space_materials_tps_coatings__thermal-protection': '열유속·삭마 성능, 타일·패널 접합부, 부착 구조와 재사용 손상평가를 분석합니다.',
  'space_materials_tps_coatings__composite': '방사선·진공 방출·열주기 환경에서 섬유·수지 조성과 성형·접합 공정을 확인합니다.',
  'space_materials_tps_coatings__tps': '소재 조성-제조 공정-성능 시험-적용 부품으로 이어지는 재료·TPS 권리사슬을 봅니다.',
  'space_remote_sensing_payload__sar-imaging': '원시 신호 수집, 거리·방위 압축, 운동보상·보정과 영상 형성 알고리즘을 구분합니다.',
  'space_remote_sensing_payload__digital-beamforming': '다채널 수신, 디지털 빔 합성, 위상·진폭 보정과 잡음·간섭 억제 구성을 확인합니다.',
  'space_remote_sensing_payload__remote-sensing': '관측 기하, 센서 교정, 지리 위치 결정과 원시자료-제품 변환 흐름을 분석합니다.',
  'space_remote_sensing_payload__core': '센서·탑재체 제어, 온보드 처리, 전송과 지상 분석의 기능 분담을 검토합니다.',
  'space_remote_sensing_payload__payload': '광학·RF 센서와 구조·열·전력·데이터 인터페이스, 정밀 지향 요구를 확인합니다.',
  'space_remote_sensing_payload__synthetic-aperture-radar': '안테나 구조, 송수신 파형, 신호처리와 간섭 억제를 SAR 시스템 수준에서 분석합니다.',
  'space_remote_sensing_payload__wide-swath': '관측폭 확대를 위한 다중 빔·다중 채널 수집과 해상도·재방문주기 사이의 설계 조건을 검토합니다.',
  'space_remote_sensing_payload__sar': 'SAR 약어와 기능 표현이 제목·초록·청구항에서 실제 합성개구 영상화를 뜻하는지 검증합니다.',
  'space_satellite_bus_thermal_power__thermal-control': '전도·복사 열경로, 히터·히트파이프·라디에이터와 제어 로직을 수동·능동 방식으로 구분합니다.',
  'space_satellite_bus_thermal_power__heat-pipe': '히트파이프의 작동유체·윅 구조, 증발부·응축부 배치와 자세·열주기별 수송 한계를 확인합니다.',
  'space_satellite_bus_thermal_power__thermal-louver': '구동기·바이메탈, 방사율 가변 구조, 개폐 제어와 고장 시 안전상태를 검토합니다.',
  'space_satellite_bus_thermal_power__spacecraft-thermal-control': '궤도 열수지, 임무 모드별 온도 제한과 탑재체·버스 사이 열 인터페이스를 분석합니다.',
  'space_satellite_bus_thermal_power__satellite-radiator': '방사율·면적, 전개 구조, 유체루프 연결과 자세·궤도 조건별 방열 성능을 확인합니다.',
  'space_satellite_bus_thermal_power__satellite-bus': '구조·전력·열·데이터 버스의 표준 인터페이스와 탑재체 수용 구조를 검토합니다.',
  'space_satellite_bus_thermal_power__core': '위성 버스 구조, 열제어, 발전·저장·배전을 질량·전력 예산과 함께 분석합니다.',
  'space_satellite_bus_thermal_power__power-system': '태양전지 발전, 배터리 저장, 전력변환·분배·보호와 에너지 관리 로직을 구분합니다.',
};

export interface ReportGuidance {
  analysisScope: string[];
  technologyFocus: string[];
  decisionQuestions: string[];
}

export function getReportGuidance(field: Field, subfield?: Subfield): ReportGuidance {
  const guidance = FIELD_GUIDANCE[field.id];
  const label = subfield?.label_ko ?? field.label_ko;
  const english = subfield && subfield.label_en !== subfield.label_ko ? ` (${subfield.label_en})` : '';
  const subfieldFocus = subfield ? SUBFIELD_FOCUS[subfield.id] : undefined;

  return {
    analysisScope: subfield
      ? [
          `‘${label}${english}’ 기술축을 ${field.label_ko} 분야 안의 독립 검색축으로 정의합니다.`,
          subfieldFocus ?? `${label}의 구성요소·공정·운용 조건을 청구항 단위로 구분합니다.`,
          `세부기술 검색어와 상위 분야 CPC·출원인 집계를 교차 확인하되, 세부기술 단위 수치가 없는 경우 상위 분야 값을 대신 사용하지 않습니다.`,
          `대표 문헌이 연결된 경우에만 문헌 수·연도·관할·주요 특허를 대표 문헌 표본 집계값으로 표시합니다.`,
        ]
      : [
          field.summary_ko,
          `검색어 범위: ${field.query_terms.join(', ')}.`,
          `분야 집계와 대표 문헌 표본을 분리해 표시하며, 집계 수치에는 대표 문헌 수를 대입하지 않습니다.`,
        ],
    technologyFocus: subfield
      ? [
          subfieldFocus ?? `${label} 관련 제목·초록·청구항과 검색어의 직접 일치 여부`,
          `${field.label_ko} 상위 CPC 축과 ${label}의 교차분류 관계`,
          `${label} 관련 출원인의 시스템·부품·공정별 권리 배치`,
        ]
      : guidance.technologyAxes,
    decisionQuestions: subfield
      ? [
          `‘${label}’ 기술축에서 독립 권리화할 구성·공정·운용 단계는 무엇인가?`,
          ...guidance.decisionQuestions.slice(0, 2).map((question) => `${label}: ${question}`),
        ]
      : guidance.decisionQuestions,
  };
}
