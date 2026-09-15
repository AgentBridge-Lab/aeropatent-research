// ============================================================================
// AEROPATENT — 그래프(LLM Wiki) 빌더 + 노드 보고서
// /graph 의 은하수형 그래프와 오른쪽 보고서 드로어가 사용한다.
// ============================================================================

import {
  PATENTS,
  FIELDS,
  SUBFIELDS,
  FIELD_ENRICHMENT,
  COUNTRIES,
  COUNTRY_ORDER,
  APPLICANTS,
  CANDIDATE_SCOPE_NOTE,
  DATA_SOURCE_NOTE,
  SAMPLE_SCORE_NOTE,
  SAMPLE_DATE_BASIS_NOTE,
  SAMPLE_BASIS_NOTE,
  OFFICE_SHARE_BASIS_NOTE,
  applyFilter,
  countryDistribution,
  yearlyTrend,
  leadingCountry,
  topApplicants,
  topPatents,
  buildInsights,
  periodStartYear,
  getField,
  getSubfield,
  getApplicant,
  hasSubfield,
} from './data';
import { getReportGuidance } from './report-content';
import type {
  Filter,
  Patent,
  Field,
  FieldEnrichment,
  FieldId,
  CountryCode,
  CountryDist,
  YearPoint,
} from './data';

export type GraphNodeType =
  | 'field'
  | 'subfield'
  | 'patent'
  | 'country'
  | 'applicant'
  | 'keyword';

export type ColorBy = 'field' | 'country' | 'period' | 'applicant' | 'nodeType';
export type Lens =
  | 'all'
  | 'field'
  | 'country'
  | 'period'
  | 'applicant'
  | 'similar';
export type LayoutMode = 'galaxy' | 'cluster' | 'hierarchy' | 'timeline';
export type LabelMode = 'important' | 'all' | 'hidden';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  field?: FieldId;
  country?: CountryCode;
  year?: number;
  applicant?: string;
  val: number; // 노드 크기 (importance 기반)
  importance: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  confidence: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const NODE_TYPE_COLOR: Record<GraphNodeType, string> = {
  field: '#8fabd4',
  subfield: '#b9c8dd',
  patent: '#efece3',
  country: '#6e92c2',
  applicant: '#4a70a9',
  keyword: '#cdc7b8',
};

export function fieldColor(id?: FieldId): string {
  return FIELDS.find((f) => f.id === id)?.color ?? '#9fb4d0';
}
export function countryColor(code?: CountryCode): string {
  return COUNTRIES.find((c) => c.code === code)?.color ?? '#9fb4d0';
}

export function nodeColor(node: GraphNode, colorBy: ColorBy): string {
  switch (colorBy) {
    case 'field':
      return fieldColor(node.field);
    case 'country':
      return node.country ? countryColor(node.country) : '#54667f';
    case 'period': {
      if (!node.year) return '#5a6473';
      const t = Math.max(0, Math.min(1, (node.year - 2016) / 10));
      // 딥블루(오래됨) → 크림(최신) 명도 램프
      const l = 40 + t * 48;
      const s = 38 - t * 16;
      return `hsl(214, ${s}%, ${l}%)`;
    }
    case 'applicant': {
      if (!node.applicant) return '#5a6473';
      let h = 0;
      for (let i = 0; i < node.applicant.length; i++) h = (h * 31 + node.applicant.charCodeAt(i)) % 360;
      // 블루 계열 한정, 명도만 변주 (팔레트 유지)
      return `hsl(214, 30%, ${56 + (h % 32)}%)`;
    }
    case 'nodeType':
    default:
      return NODE_TYPE_COLOR[node.type];
  }
}

// 그래프 빌드: 필터된 특허 집합으로부터 노드/엣지 생성 (노드 < 400, 엣지 800~1500 목표)
export function getGraphData(filter: Filter, maxPatents = 150): GraphData {
  const all = applyFilter(filter);
  // 중요도 상위 N개로 제한 (성능)
  const patents = [...all]
    .sort((a, b) => b.importance_score - a.importance_score)
    .slice(0, maxPatents);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const add = (n: GraphNode) => {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      nodes.push(n);
    }
  };

  // 대표 문헌이 아직 없는 분야도 탐색할 수 있도록 현재 분야 필터에 맞는 분류 노드를 모두 표시한다.
  const visibleFields = FIELDS.filter((field) => filter.field === 'all' || field.id === filter.field);
  visibleFields.forEach((f) =>
    add({ id: `field.${f.id}`, type: 'field', label: f.label_ko, field: f.id, val: 26, importance: 1 })
  );

  // 같은 이유로 세부기술 분류 노드도 대표 문헌 유무와 관계없이 표시한다.
  SUBFIELDS.filter((s) => visibleFields.some((field) => field.id === s.field)).forEach((s) => {
    add({ id: `subfield.${s.id}`, type: 'subfield', label: s.label_ko, field: s.field, val: 12, importance: 0.7 });
    edges.push({ source: `subfield.${s.id}`, target: `field.${s.field}`, type: 'belongs_to', confidence: 0.95 });
  });

  // 국가 노드 (필터에 포함된)
  COUNTRY_ORDER.filter((c) => filter.countries.includes(c)).forEach((c) =>
    add({ id: `country.${c}`, type: 'country', label: c, country: c, val: 18, importance: 0.9 })
  );

  // 출원인 노드 (등장한 것만)
  const activeApplicants = new Set(patents.map((p) => p.applicant));
  APPLICANTS.filter((a) => activeApplicants.has(a.id)).forEach((a) =>
    add({
      id: `applicant.${a.id}`,
      type: 'applicant',
      label: a.name,
      applicant: a.id,
      val: 9,
      importance: 0.55,
    })
  );

  // 키워드 노드 (등장 빈도 상위만 — 과밀 방지)
  const kwFreq = new Map<string, number>();
  patents.forEach((p) => p.keywords.forEach((k) => kwFreq.set(k, (kwFreq.get(k) ?? 0) + 1)));
  const topKw = new Set(
    Array.from(kwFreq.entries())
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([k]) => k)
  );
  topKw.forEach((k) =>
    add({ id: `keyword.${k}`, type: 'keyword', label: k, val: 5, importance: 0.3 })
  );

  // 특허 노드 + 엣지
  patents.forEach((p) => {
    add({
      id: p.id,
      type: 'patent',
      label: p.publication_number,
      field: p.field,
      country: p.country,
      year: p.filing_year,
      applicant: p.applicant,
      val: 3 + p.importance_score * 6,
      importance: p.importance_score,
    });
    p.subfield_ids.forEach((subfieldId) => {
      edges.push({ source: p.id, target: `subfield.${subfieldId}`, type: 'belongs_to', confidence: 0.9 });
    });
    edges.push({ source: p.id, target: `country.${p.country}`, type: 'filed_in', confidence: 1 });
    if (seen.has(`applicant.${p.applicant}`))
      edges.push({ source: p.id, target: `applicant.${p.applicant}`, type: 'filed_by', confidence: 0.95 });
    p.keywords.forEach((k) => {
      if (topKw.has(k))
        edges.push({ source: p.id, target: `keyword.${k}`, type: 'uses_keyword', confidence: 0.7 });
    });
  });

  // 동일 세부분야 엣지 — 같은 subfield 문헌끼리의 표시용 연결이다.
  // 원천 인용 레코드가 없으므로 인용 관계로 표시하지 않는다.
  const bySub = new Map<string, Patent[]>();
  patents.forEach((p) => {
    p.subfield_ids.forEach((subfieldId) => {
      const arr = bySub.get(subfieldId) ?? [];
      arr.push(p);
      bySub.set(subfieldId, arr);
    });
  });
  bySub.forEach((arr) => {
    const sorted = arr.sort((a, b) => b.importance_score - a.importance_score).slice(0, 6);
    for (let i = 0; i < sorted.length - 1; i++) {
      edges.push({
        source: sorted[i].id,
        target: sorted[i + 1].id,
        type: 'same_subfield',
        confidence: 0.5,
      });
    }
  });

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// 노드 보고서 (드로어용)
// ---------------------------------------------------------------------------
export interface ReportKpi {
  label: string;
  value: string;
}
export interface NodeReport {
  node_id: string;
  node_type: GraphNodeType;
  title: string;
  one_line_conclusion: string;
  kpis: ReportKpi[];
  country_distribution: CountryDist[];
  yearly_trend: YearPoint[];
  insights: string[];
  top_patents: Patent[];
  sample_count?: number;
  basis_note?: string;
  country_distribution_basis?: string;
  yearly_trend_basis?: string;
  analysis_scope?: string[];
  technology_focus?: string[];
  decision_questions?: string[];
  limitations?: string[];
  top_applicants?: { name: string; count: number; basis: string }[];
  kr_top_applicants?: { name: string; count: number }[];
  top_cpc_codes?: { code: string; count: number }[];
  reference_patents?: {
    publication_number: string;
    title: string;
    citing_families: number;
    source_url: string;
    basis: string;
  }[];
  subfield_overview?: {
    id: string;
    label: string;
    label_en: string;
    description: string;
    sample_count: number;
  }[];
  // 특허 노드 전용
  patent?: Patent;
  similar?: Patent[];
  evidence?: { label: string; text: string }[];
}

export const REPORT_FILTER: Filter = {
  field: 'all',
  countries: [...COUNTRY_ORDER],
  period: 'all',
};

function scopedPatents(predicate: (p: Patent) => boolean, filter: Filter): Patent[] {
  return applyFilter(filter).filter(predicate);
}

function fieldCountryDistribution(field: Field): CountryDist[] {
  const counts = COUNTRY_ORDER.map((code) => field.country_family_counts[code] ?? 0);
  const total = counts.reduce((sum, count) => sum + count, 0) || 1;
  return COUNTRY_ORDER.map((code, index) => ({
    country: code,
    label_ko: COUNTRIES.find((country) => country.code === code)?.label_ko ?? code,
    color: COUNTRIES.find((country) => country.code === code)?.color ?? '#8fabd4',
    count: counts[index],
    share: counts[index] / total,
  }));
}

function enrichmentTrend(enrichment?: FieldEnrichment): YearPoint[] {
  if (!enrichment) return [];
  return Object.entries(enrichment.yearly_families)
    .map(([year, count]) => ({ year: Number(year), count }))
    .sort((a, b) => a.year - b.year);
}

export function getNodeReport(nodeId: string, filter: Filter): NodeReport | null {
  const [type, rawId] = [nodeId.split('.')[0], nodeId.split('.').slice(1).join('.')];

  // 특허 노드: patent.XXXX
  if (type === 'patent') {
    const patent = PATENTS.find((p) => p.id === nodeId);
    if (!patent) return null;
    const similar = PATENTS.filter(
      (p) => p.id !== patent.id && patent.subfield_ids.some((subfieldId) => hasSubfield(p, subfieldId))
    )
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, 4);
    return {
      node_id: nodeId,
      node_type: 'patent',
      title: patent.publication_number,
      one_line_conclusion: patent.title,
      kpis: [
        { label: '공개 관할', value: patent.country },
        { label: patent.date_basis_label, value: String(patent.filing_year) },
        { label: '표본 정렬점수', value: patent.importance_score.toFixed(2) },
        { label: '상태', value: patent.status },
      ],
      country_distribution: [],
      yearly_trend: [],
      insights: [],
      top_patents: [],
      patent,
      similar,
      evidence: [
        { label: '요약·초록 발췌', text: patent.abstract_ko },
        { label: '표본 정렬점수', text: SAMPLE_SCORE_NOTE },
        ...patent.date_quality_notes.map((text) => ({ label: '날짜 원자료 확인', text })),
        ...(patent.claims[0]
          ? [{ label: `청구항 ${patent.claims[0].claim_number} 발췌 (원문 기준)`, text: patent.claims[0].summary_ko }]
          : [{ label: '청구항', text: '청구항 정보 없음' }]),
      ],
    };
  }

  // 분야 / 세부분야 노드
  if (type === 'field' || type === 'subfield') {
    if (type === 'field') {
      const f = getField(rawId as FieldId);
      if (!f) return null;
      const patents = PATENTS.filter((patent) => patent.field === f.id);
      const enrichment = FIELD_ENRICHMENT[f.id];
      const dist = fieldCountryDistribution(f);
      const lead = [...dist].sort((a, b) => b.count - a.count)[0];
      const recent5Share = f.family_count > 0 ? f.recent5_family_count / f.family_count : 0;
      const guidance = getReportGuidance(f);
      const topApplicant = f.top_applicants[0];

      return {
        node_id: nodeId,
        node_type: 'field',
        title: `${f.label_ko} 특허 클러스터`,
        one_line_conclusion: `${f.label_ko} 분야는 최근 10년 우선권 기준 ${f.family_count.toLocaleString()}개 패밀리이며, 최근 5년 패밀리 비중은 ${(recent5Share * 100).toFixed(1)}%입니다.`,
        kpis: [
          { label: '고유 패밀리', value: `${f.family_count.toLocaleString()}개` },
          { label: '공개문헌', value: `${f.publication_count.toLocaleString()}건` },
          { label: '최근 5년', value: `${f.recent5_family_count.toLocaleString()}개` },
          { label: '최근 3년 비중', value: `${(f.recent_momentum * 100).toFixed(1)}%` },
        ],
        country_distribution: dist,
        yearly_trend: enrichmentTrend(enrichment),
        insights: [
          `표시 5개 공개 관할 중 ${lead.label_ko} 공개 관할이 ${lead.count.toLocaleString()}개로 가장 큽니다. 출원인 소재국 순위가 아닙니다.`,
          topApplicant
            ? `집계상 상위 출원인은 ${topApplicant.name}(${topApplicant.count.toLocaleString()}개 패밀리)입니다.`
            : '상위 출원인 집계가 제공되지 않았습니다.',
          ...f.report_bullets,
          ...(enrichment
            ? [`상위 5개 명칭의 패밀리 계수 비율(CR5*)은 ${(enrichment.cr5 * 100).toFixed(1)}%입니다. 공동출원 중복과 법인 동일성 미확인이 포함되며 시장점유율이나 경쟁 강도를 뜻하지 않습니다.`]
            : ['상위 5개 출원인 집중도는 현재 집계가 제공되지 않았습니다.']),
          ...f.risk_notes,
        ],
        top_patents: topPatents(patents, 5),
        sample_count: patents.length,
        basis_note: `최근 10년 우선권 기준 · ${CANDIDATE_SCOPE_NOTE}`,
        country_distribution_basis: OFFICE_SHARE_BASIS_NOTE,
        yearly_trend_basis: '2016–2025 우선연도 보강 코호트의 분야별 패밀리 추세 · 최근 10년 이동 기간 집계와 기준 차이 · 연도 간 패밀리 중복 가능 · 최근 연도 공개 지연 유의',
        analysis_scope: guidance.analysisScope,
        technology_focus: guidance.technologyFocus,
        decision_questions: guidance.decisionQuestions,
        limitations: [
          '한 패밀리가 여러 분야와 공개 관할에 중복될 수 있어 분야·관할 합계는 전체 고유 패밀리와 일치하지 않을 수 있습니다.',
          '대표 문헌은 원문 검토를 위한 예시 표본이며 분야 전체 모집단이나 중요도 순위를 뜻하지 않습니다.',
          '피인용 후보와 집중도는 연구기획 참고용이며 FTO·침해·무효 판단에는 원문 청구항과 법적 상태 검토가 필요합니다.',
        ],
        top_applicants: f.top_applicants.map((item) => ({
          name: item.name,
          count: item.count,
          basis: '글로벌 상위 출원인 · 패밀리 기준',
        })),
        kr_top_applicants: (enrichment?.kr_top_applicants ?? []).map((item) => ({
          name: item.name,
          count: item.families,
        })),
        top_cpc_codes: f.top_cpc_codes,
        subfield_overview: SUBFIELDS.filter((subfield) => subfield.field === f.id).map((subfield) => ({
          id: subfield.id,
          label: subfield.label_ko,
          label_en: subfield.label_en,
          description: getReportGuidance(f, subfield).analysisScope[0],
          sample_count: patents.filter((patent) => hasSubfield(patent, subfield.id)).length,
        })),
        evidence: [
          { label: '집계 데이터', text: `${DATA_SOURCE_NOTE}. 분야·관할·연도·출원인·CPC 수치는 최신 BigQuery 분석 스냅샷을 사용했습니다.` },
          { label: '대표 문헌', text: `${SAMPLE_BASIS_NOTE}. 원문 링크가 있는 문헌만 주요 특허에 표시합니다.` },
          { label: '피인용 후보', text: 'CPC 후보군의 피인용 상위 문헌은 기술 적합성에 대한 제목·초록·청구항 검증이 끝나지 않아 이 보고서에서 제외했습니다.' },
        ],
      };
    }

    const sf = getSubfield(rawId);
    if (!sf) return null;
    const parent = getField(sf.field);
    if (!parent) return null;
    const patents = PATENTS.filter((patent) => hasSubfield(patent, sf.id));
    const familyCount = new Set(patents.map((patent) => patent.family_id ?? patent.id)).size;
    const enrichment = FIELD_ENRICHMENT[parent.id];
    const hasSample = patents.length > 0;
    const dist = hasSample ? countryDistribution(patents) : [];
    const lead = hasSample ? [...dist].sort((a, b) => b.count - a.count)[0] : null;
    const guidance = getReportGuidance(parent, sf);

    return {
      node_id: nodeId,
      node_type: 'subfield',
      title: `${sf.label_ko} 세부기술 보고서`,
      one_line_conclusion: hasSample
        ? `${parent.label_ko} 분야의 ‘${sf.label_ko}’ 기술축에 연결된 대표 문헌은 전체 표본 기준 ${patents.length}건입니다.`
        : `‘${sf.label_ko}’ 기술축은 ${parent.label_ko} 분야의 독립 검색축입니다. 현재 세부기술 단위 대표 문헌이 없어 상위 분야 집계와 검색 기준을 분리해 제시합니다.`,
      kpis: hasSample
        ? [
            { label: '검토 패밀리', value: `${familyCount}개` },
            { label: '대표 문헌', value: `${patents.length}건` },
            { label: '출원인', value: `${new Set(patents.map((patent) => patent.applicant)).size}곳` },
            { label: '최다 관할', value: lead?.country ?? '-' },
          ]
        : [
            { label: '상위 분야 패밀리', value: `${parent.family_count.toLocaleString()}개` },
            { label: '상위 분야 최근 5년', value: `${parent.recent5_family_count.toLocaleString()}개` },
            { label: '최근 3년 비중', value: `${(parent.recent_momentum * 100).toFixed(1)}%` },
            { label: '세부기술 문헌', value: '보강 필요' },
          ],
      country_distribution: dist,
      yearly_trend: hasSample ? yearlyTrend(patents) : [],
      insights: [
        ...parent.report_bullets,
        hasSample
          ? `대표 문헌 ${patents.length}건은 세부기술 탐색의 시작점이며 모집단 통계로 해석하지 않습니다.`
          : '현재 세부기술 단위 문헌·관할·출원인 집계가 없어 0건 그래프를 표시하지 않습니다. 후속 수집 전에는 상위 분야 수치를 세부기술 값처럼 사용하지 않습니다.',
        ...parent.risk_notes,
      ],
      top_patents: topPatents(patents, Math.min(patents.length, 12)),
      sample_count: patents.length,
      basis_note: hasSample
        ? `대표 문헌 표본 ${patents.length}건 · 전체 표본 기간`
        : `세부기술 정의·검색 기준 보고서 · 상위 분야는 최근 10년 우선권 기준`,
      country_distribution_basis: hasSample ? '세부기술 대표 문헌 표본' : undefined,
      yearly_trend_basis: hasSample ? SAMPLE_DATE_BASIS_NOTE : undefined,
      analysis_scope: guidance.analysisScope,
      technology_focus: guidance.technologyFocus,
      decision_questions: guidance.decisionQuestions,
      limitations: [
        hasSample
          ? '표시된 문헌 수와 분포는 대표 문헌 표본 기준이며 세부기술 전체 모집단을 뜻하지 않습니다.'
          : '세부기술 단위 문헌이 아직 수집되지 않아 문헌 수·국가 분포·연도 추세·출원인 순위를 산출하지 않았습니다.',
        `상위 분야 수치(${parent.label_ko})는 기술 환경을 이해하기 위한 배경이며 ${sf.label_ko}의 직접 집계값이 아닙니다.`,
        '전략 검토나 권리 판단 전에는 검색식 보강, 패밀리 중복 제거, 원문 청구항 검증이 필요합니다.',
      ],
      top_applicants: parent.top_applicants.map((item) => ({
        name: item.name,
        count: item.count,
        basis: `${parent.label_ko} 상위 분야 집계`,
      })),
      kr_top_applicants: (enrichment?.kr_top_applicants ?? []).map((item) => ({
        name: item.name,
        count: item.families,
      })),
      top_cpc_codes: parent.top_cpc_codes,
      evidence: [
        { label: '세부기술 범위', text: `${sf.label_ko}(${sf.label_en}) 검색축과 ${parent.label_ko} 분야의 검색어·CPC 기준을 사용합니다.` },
        { label: '데이터 구분', text: `${DATA_SOURCE_NOTE}. 상위 분야 집계와 세부기술 대표 문헌 표본을 구분해 표시합니다.` },
        { label: '피인용 후보', text: '상위 분야의 미검증 CPC 피인용 후보는 세부기술 근거로 재사용하지 않았습니다.' },
      ],
    };
  }

  // 국가 노드
  if (type === 'country') {
    const code = rawId as CountryCode;
    const c = COUNTRIES.find((x) => x.code === code);
    if (!c) return null;
    const patents = scopedPatents((p) => p.country === code, filter);
    const hasSample = patents.length > 0;
    const byField = FIELDS.map((f) => ({
      f,
      count: patents.filter((p) => p.field === f.id).length,
    })).sort((a, b) => b.count - a.count);
    return {
      node_id: nodeId,
      node_type: 'country',
      title: `${c.label_ko} 공개 관할 표본`,
      one_line_conclusion: hasSample
        ? `${c.label_ko} 공개 관할 표본 ${patents.length}건 중 최다 분야는 ${byField[0]?.f.label_ko ?? '-'}입니다.`
        : `${c.label_ko} 공개 관할에 연결된 대표 문헌이 현재 표본에는 없습니다.`,
      kpis: [
        { label: '표본 문헌', value: `${patents.length}건` },
        { label: '최다 분야', value: hasSample ? (byField[0]?.f.label_ko ?? '-') : '-' },
        { label: '주요출원인', value: String(topApplicants(patents, 1)[0]?.name ?? '-') },
      ],
      country_distribution: hasSample ? countryDistribution(patents) : [],
      yearly_trend: hasSample ? yearlyTrend(patents, periodStartYear(filter.period) || undefined) : [],
      insights: hasSample
        ? [
            `${c.label_ko} 공개 관할 표본 내 문헌이 많은 분야는 ${byField.filter((x) => x.count > 0).slice(0, 3).map((x) => x.f.label_ko).join(', ')}입니다.`,
            `주요 출원인: ${topApplicants(patents, 3).map((a) => a.name).join(', ')}.`,
          ]
        : ['대표 문헌이 보강되기 전에는 분야 순위·출원인·연도 추세를 산출하지 않습니다.'],
      top_patents: topPatents(patents, 5),
      basis_note: '수동 선정 대표 문헌 표본 · 모집단의 규모나 성장률 추정에 사용하지 않음',
      country_distribution_basis: '대표 문헌의 공개 관할별 건수 · 출원인 소재국 아님',
      yearly_trend_basis: SAMPLE_DATE_BASIS_NOTE,
    };
  }

  // 출원인 노드
  if (type === 'applicant') {
    const a = getApplicant(rawId);
    if (!a) return null;
    const patents = scopedPatents((p) => p.applicant === a.id, filter);
    const hasSample = patents.length > 0;
    const byField = FIELDS.map((f) => ({
      f,
      count: patents.filter((p) => p.field === f.id).length,
    })).sort((x, y) => y.count - x.count);
    return {
      node_id: nodeId,
      node_type: 'applicant',
      title: a.name,
      one_line_conclusion: hasSample
        ? `${a.name}는 현재 대표 표본에서 ${byField[0]?.f.label_ko ?? ''} 분야 문헌이 가장 많습니다.`
        : `${a.name}에 연결된 대표 문헌이 현재 표본에는 없습니다.`,
      kpis: [
        { label: '표본 문헌', value: `${patents.length}건` },
        { label: '표본 공개 관할', value: a.publication_countries.join(', ') || '-' },
        { label: '주력분야', value: hasSample ? (byField[0]?.f.label_ko ?? '-') : '-' },
        { label: '등록 표본', value: `${patents.filter((p) => p.status === '등록').length}건` },
      ],
      country_distribution: [],
      yearly_trend: hasSample ? yearlyTrend(patents, periodStartYear(filter.period) || undefined) : [],
      insights: hasSample
        ? [`대표 표본 내 분야: ${byField.filter((x) => x.count > 0).map((x) => `${x.f.label_ko}(${x.count})`).join(', ')}.`]
        : ['대표 문헌이 보강되기 전에는 주력 분야·연도 추세를 산출하지 않습니다.'],
      top_patents: topPatents(patents, 5),
      basis_note: '수동 선정 대표 문헌 표본 · 모집단의 규모나 성장률 추정에 사용하지 않음',
      country_distribution_basis: '대표 문헌의 공개 관할별 건수 · 출원인 소재국 아님',
      yearly_trend_basis: SAMPLE_DATE_BASIS_NOTE,
    };
  }

  // 키워드 노드
  if (type === 'keyword') {
    const kw = rawId;
    const patents = scopedPatents((p) => p.keywords.includes(kw), filter);
    const hasSample = patents.length > 0;
    return {
      node_id: nodeId,
      node_type: 'keyword',
      title: kw,
      one_line_conclusion: hasSample
        ? `'${kw}' 키워드에 직접 연결된 대표 문헌 ${patents.length}건의 표본 보고서입니다.`
        : `'${kw}' 키워드에 직접 연결된 대표 문헌이 현재 표본에는 없습니다.`,
      kpis: [
        { label: '표본 문헌', value: `${patents.length}건` },
        { label: '최다 관할', value: hasSample ? leadingCountry(patents) : '-' },
        { label: '대표분야', value: getField(patents[0]?.field as FieldId)?.label_ko ?? '-' },
      ],
      country_distribution: hasSample ? countryDistribution(patents) : [],
      yearly_trend: hasSample ? yearlyTrend(patents, periodStartYear(filter.period) || undefined) : [],
      insights: hasSample
        ? buildInsights(patents, filter)
        : ['대표 문헌이 보강되기 전에는 관할 순위·증가율·연도 추세를 산출하지 않습니다.'],
      top_patents: topPatents(patents, 5),
      basis_note: '수동 선정 대표 문헌 표본 · 모집단의 규모나 성장률 추정에 사용하지 않음',
      country_distribution_basis: '대표 문헌의 공개 관할별 건수 · 출원인 소재국 아님',
      yearly_trend_basis: SAMPLE_DATE_BASIS_NOTE,
    };
  }

  return null;
}


/** Fixed coordinates for selectable graph layouts; free coordinates stay undefined. */
export function graphLayoutPosition(node: GraphNode, layout: LayoutMode, currentYear: number) {
  const position: { fx?: number; fy?: number; fz?: number } = { fx: undefined, fy: undefined, fz: undefined };
  if (layout === 'timeline' && node.year) {
    position.fx = ((node.year - 2016) / Math.max(1, currentYear - 2016)) * 900 - 450;
  } else if (layout === 'cluster') {
    const index = FIELDS.findIndex((field) => field.id === node.field);
    if (index >= 0) {
      const angle = (index / FIELDS.length) * Math.PI * 2;
      position.fx = Math.cos(angle) * 260;
      position.fz = Math.sin(angle) * 260;
    }
  } else if (layout === 'hierarchy') {
    const level = { field: -220, subfield: -100, patent: 60, country: 220, applicant: 220, keyword: 220 };
    position.fy = level[node.type];
  }
  return position;
}


/** Search link matching the node shown in the drawer, with unrelated local controls removed. */
export function getReportSearchQuery(report: NodeReport, query = ''): string {
  const params = new URLSearchParams(query);
  ['q', 'subfield', 'applicant', 'node', 'status', 'sort'].forEach((key) => params.delete(key));
  const rawId = report.node_id.split('.').slice(1).join('.');
  if (report.node_type === 'field') params.set('field', rawId);
  if (report.node_type === 'subfield') {
    const subfield = getSubfield(rawId);
    if (subfield) params.set('field', subfield.field);
    params.set('subfield', rawId);
  }
  if (report.node_type === 'country') params.set('countries', rawId);
  if (report.node_type === 'applicant') params.set('applicant', rawId);
  if (report.node_type === 'keyword') params.set('q', rawId);
  if (report.node_type === 'patent' && report.patent) {
    params.delete('field'); params.delete('countries'); params.delete('period');
    params.set('q', report.patent.publication_number);
  }
  return params.toString();
}
