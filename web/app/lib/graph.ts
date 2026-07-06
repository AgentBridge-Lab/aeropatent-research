// ============================================================================
// AEROPATENT — 그래프(LLM Wiki) 빌더 + 노드 보고서
// /graph 의 은하수형 그래프와 오른쪽 보고서 드로어가 사용한다.
// ============================================================================

import {
  PATENTS,
  FIELDS,
  SUBFIELDS,
  COUNTRIES,
  COUNTRY_ORDER,
  APPLICANTS,
  applyFilter,
  countryDistribution,
  yearlyTrend,
  growthRate,
  leadingCountry,
  topApplicants,
  topPatents,
  buildInsights,
  periodStartYear,
  getField,
  getSubfield,
  getApplicant,
} from './data';
import type {
  Filter,
  Patent,
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
  | 'citation'
  | 'similar';
export type LayoutMode = 'galaxy' | 'cluster' | 'hierarchy' | 'timeline' | 'citation';
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

const NODE_TYPE_COLOR: Record<GraphNodeType, string> = {
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

  // 활성 분야
  const activeFields = new Set<FieldId>(patents.map((p) => p.field));
  FIELDS.filter((f) => activeFields.has(f.id)).forEach((f) =>
    add({ id: `field.${f.id}`, type: 'field', label: f.label_ko, field: f.id, val: 26, importance: 1 })
  );

  // 활성 세부분야
  const activeSubs = new Set(patents.map((p) => p.subfield));
  SUBFIELDS.filter((s) => activeSubs.has(s.id)).forEach((s) => {
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
      country: a.country,
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
    edges.push({ source: p.id, target: `subfield.${p.subfield}`, type: 'belongs_to', confidence: 0.9 });
    edges.push({ source: p.id, target: `country.${p.country}`, type: 'filed_in', confidence: 1 });
    if (seen.has(`applicant.${p.applicant}`))
      edges.push({ source: p.id, target: `applicant.${p.applicant}`, type: 'filed_by', confidence: 0.95 });
    p.keywords.forEach((k) => {
      if (topKw.has(k))
        edges.push({ source: p.id, target: `keyword.${k}`, type: 'uses_keyword', confidence: 0.7 });
    });
  });

  // 유사/인용 엣지 (같은 subfield 특허끼리 약하게 연결, 과밀 방지 위해 일부만)
  const bySub = new Map<string, Patent[]>();
  patents.forEach((p) => {
    const arr = bySub.get(p.subfield) ?? [];
    arr.push(p);
    bySub.set(p.subfield, arr);
  });
  bySub.forEach((arr) => {
    const sorted = arr.sort((a, b) => b.importance_score - a.importance_score).slice(0, 6);
    for (let i = 0; i < sorted.length - 1; i++) {
      edges.push({
        source: sorted[i].id,
        target: sorted[i + 1].id,
        type: i % 2 === 0 ? 'similar_to' : 'cites',
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
  // 특허 노드 전용
  patent?: Patent;
  similar?: Patent[];
  evidence?: { label: string; text: string }[];
}

function scopedPatents(predicate: (p: Patent) => boolean, filter: Filter): Patent[] {
  return applyFilter(filter).filter(predicate);
}

export function getNodeReport(nodeId: string, filter: Filter): NodeReport | null {
  const [type, rawId] = [nodeId.split('.')[0], nodeId.split('.').slice(1).join('.')];

  // 특허 노드: patent.XXXX
  if (type === 'patent') {
    const patent = PATENTS.find((p) => p.id === nodeId);
    if (!patent) return null;
    const similar = PATENTS.filter(
      (p) => p.id !== patent.id && p.subfield === patent.subfield
    )
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, 4);
    return {
      node_id: nodeId,
      node_type: 'patent',
      title: patent.publication_number,
      one_line_conclusion: patent.title,
      kpis: [
        { label: '국가', value: patent.country },
        { label: '출원연도', value: String(patent.filing_year) },
        { label: '중요도', value: patent.importance_score.toFixed(2) },
        { label: '피인용', value: String(patent.citations) },
      ],
      country_distribution: [],
      yearly_trend: [],
      insights: [],
      top_patents: [],
      patent,
      similar,
      evidence: [
        { label: '초록', text: patent.abstract_ko },
        { label: `대표 청구항 (청구항 ${patent.claims[0]?.claim_number ?? 1})`, text: patent.claims[0]?.summary_ko ?? '' },
      ],
    };
  }

  // 분야 / 세부분야 노드
  if (type === 'field' || type === 'subfield') {
    let patents: Patent[];
    let title: string;
    if (type === 'field') {
      const f = getField(rawId as FieldId);
      if (!f) return null;
      patents = scopedPatents((p) => p.field === f.id, filter);
      title = `${f.label_ko} 특허 클러스터`;
    } else {
      const sf = getSubfield(rawId);
      if (!sf) return null;
      patents = scopedPatents((p) => p.subfield === sf.id, filter);
      title = `${sf.label_ko} 특허 클러스터`;
    }
    const dist = countryDistribution(patents);
    const lead = leadingCountry(patents);
    const krShare = dist.find((d) => d.country === 'KR')?.share ?? 0;
    return {
      node_id: nodeId,
      node_type: type,
      title,
      one_line_conclusion: `최근 ${COUNTRIES.find((c) => c.code === lead)!.label_ko}·중국 중심으로 출원이 증가했고, 한국은 소재·부품 단위 출원은 있으나 시스템 통합 특허는 약합니다.`,
      kpis: [
        { label: '특허', value: `${patents.length}건` },
        { label: '증가율', value: `+${Math.round(growthRate(patents, filter) * 100)}%` },
        { label: '선도국', value: lead },
        { label: '한국 비중', value: `${Math.round(krShare * 100)}%` },
      ],
      country_distribution: dist,
      yearly_trend: yearlyTrend(patents, periodStartYear(filter.period) || undefined),
      insights: buildInsights(patents, filter),
      top_patents: topPatents(patents, 5),
    };
  }

  // 국가 노드
  if (type === 'country') {
    const code = rawId as CountryCode;
    const c = COUNTRIES.find((x) => x.code === code);
    if (!c) return null;
    const patents = scopedPatents((p) => p.country === code, filter);
    const byField = FIELDS.map((f) => ({
      f,
      count: patents.filter((p) => p.field === f.id).length,
    })).sort((a, b) => b.count - a.count);
    return {
      node_id: nodeId,
      node_type: 'country',
      title: `${c.label_ko} 항공우주 특허`,
      one_line_conclusion: `${c.label_ko}는 ${byField[0]?.f.label_ko ?? ''} 분야에서 강점을 보이며, 최근 출원 추세가 뚜렷합니다.`,
      kpis: [
        { label: '특허', value: `${patents.length}건` },
        { label: '증가율', value: `+${Math.round(growthRate(patents, { ...filter, countries: [code] }) * 100)}%` },
        { label: '강점분야', value: byField[0]?.f.label_ko ?? '-' },
        { label: '주요출원인', value: String(topApplicants(patents, 1)[0]?.name ?? '-') },
      ],
      country_distribution: countryDistribution(patents),
      yearly_trend: yearlyTrend(patents, periodStartYear(filter.period) || undefined),
      insights: [
        `${c.label_ko}의 강점 분야는 ${byField.slice(0, 3).map((x) => x.f.label_ko).join(', ')} 입니다.`,
        `주요 출원인: ${topApplicants(patents, 3).map((a) => a.name).join(', ')}.`,
      ],
      top_patents: topPatents(patents, 5),
    };
  }

  // 출원인 노드
  if (type === 'applicant') {
    const a = getApplicant(rawId);
    if (!a) return null;
    const patents = scopedPatents((p) => p.applicant === a.id, filter);
    const byField = FIELDS.map((f) => ({
      f,
      count: patents.filter((p) => p.field === f.id).length,
    })).sort((x, y) => y.count - x.count);
    return {
      node_id: nodeId,
      node_type: 'applicant',
      title: a.name,
      one_line_conclusion: `${a.name}는 ${byField[0]?.f.label_ko ?? ''} 분야를 중심으로 포트폴리오를 보유하고 있습니다.`,
      kpis: [
        { label: '특허', value: `${patents.length}건` },
        { label: '국가', value: a.country },
        { label: '주력분야', value: byField[0]?.f.label_ko ?? '-' },
        { label: '피인용', value: String(patents.reduce((s, p) => s + p.citations, 0)) },
      ],
      country_distribution: [],
      yearly_trend: yearlyTrend(patents, periodStartYear(filter.period) || undefined),
      insights: [
        `보유 분야: ${byField.filter((x) => x.count > 0).map((x) => `${x.f.label_ko}(${x.count})`).join(', ')}.`,
      ],
      top_patents: topPatents(patents, 5),
    };
  }

  // 키워드 노드
  if (type === 'keyword') {
    const kw = rawId;
    const patents = scopedPatents((p) => p.keywords.includes(kw), filter);
    return {
      node_id: nodeId,
      node_type: 'keyword',
      title: kw,
      one_line_conclusion: `'${kw}' 키워드를 포함하는 특허 클러스터입니다.`,
      kpis: [
        { label: '특허', value: `${patents.length}건` },
        { label: '증가율', value: `+${Math.round(growthRate(patents, filter) * 100)}%` },
        { label: '선도국', value: leadingCountry(patents) },
        { label: '대표분야', value: getField(patents[0]?.field as FieldId)?.label_ko ?? '-' },
      ],
      country_distribution: countryDistribution(patents),
      yearly_trend: yearlyTrend(patents, periodStartYear(filter.period) || undefined),
      insights: buildInsights(patents, filter),
      top_patents: topPatents(patents, 5),
    };
  }

  return null;
}
