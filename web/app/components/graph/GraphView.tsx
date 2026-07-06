'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import SpriteText from 'three-spritetext';
import styles from './GraphView.module.css';
import { getGraphData, nodeColor as colorOf } from '../../lib/graph';
import type {
  GraphNode,
  GraphData,
  ColorBy,
  Lens,
  LayoutMode,
  LabelMode,
} from '../../lib/graph';
import { parseFilter, FIELDS, COUNTRIES, CURRENT_YEAR } from '../../lib/data';
import { useDrawer } from '../../lib/store';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

type Spacing = 'compact' | 'normal' | 'wide';

const LENSES: { id: Lens; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'field', label: '분야별' },
  { id: 'country', label: '국가별' },
  { id: 'applicant', label: '출원인별' },
  { id: 'citation', label: '인용망' },
  { id: 'similar', label: '유사특허' },
];
const COLOR_BYS: { id: ColorBy; label: string }[] = [
  { id: 'field', label: '분야' },
  { id: 'country', label: '국가' },
  { id: 'period', label: '기간' },
  { id: 'applicant', label: '출원인' },
  { id: 'nodeType', label: '노드 유형' },
];
const LAYOUTS: { id: LayoutMode; label: string }[] = [
  { id: 'galaxy', label: '은하' },
  { id: 'cluster', label: '클러스터' },
  { id: 'timeline', label: '타임라인' },
  { id: 'hierarchy', label: '계층' },
  { id: 'citation', label: '인용 네트워크' },
];

const TYPE_LABEL: Record<string, string> = {
  field: '분야',
  subfield: '세부분야',
  patent: '특허',
  country: '국가',
  applicant: '출원인',
  keyword: '키워드',
};

const DIM_NODE = 'rgba(120,140,170,0.13)';
const DIM_LINK = 'rgba(120,140,170,0.05)';

export default function GraphView() {
  const searchParams = useSearchParams();
  const filter = useMemo(
    () => parseFilter(Object.fromEntries(searchParams.entries())),
    [searchParams]
  );
  const initialNode = searchParams.get('node');
  const openDrawer = useDrawer((s) => s.open);

  const [lens, setLens] = useState<Lens>('all');
  const [colorBy, setColorBy] = useState<ColorBy>('field');
  const [layout, setLayout] = useState<LayoutMode>('galaxy');
  const [labelMode, setLabelMode] = useState<LabelMode>('important');
  const [spacing, setSpacing] = useState<Spacing>('normal');
  const [hopDepth, setHopDepth] = useState<1 | 2>(1);
  const [importantOnly, setImportantOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(initialNode);

  const fgRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  // 그래프는 클라이언트 전용(WebGL + URL 필터). 마운트 후에만 렌더해
  // 서버/클라이언트 첫 렌더를 일치시켜 하이드레이션 미스매치를 방지한다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 그래프 데이터 (필터 기반)
  const data: GraphData = useMemo(() => getGraphData(filter), [filter]);

  // 인접 리스트
  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    data.edges.forEach((e) => {
      const s = typeof e.source === 'string' ? e.source : (e.source as any).id;
      const t = typeof e.target === 'string' ? e.target : (e.target as any).id;
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s)!.add(t);
      m.get(t)!.add(s);
    });
    return m;
  }, [data]);

  // 선택 노드 기준 강조 집합 (1-hop / 2-hop)
  const highlight = useMemo(() => {
    if (!selected) return null;
    const nodes = new Set<string>([selected]);
    let frontier = [selected];
    for (let d = 0; d < hopDepth; d++) {
      const next: string[] = [];
      frontier.forEach((id) => {
        adjacency.get(id)?.forEach((nb) => {
          if (!nodes.has(nb)) {
            nodes.add(nb);
            next.push(nb);
          }
        });
      });
      frontier = next;
    }
    return nodes;
  }, [selected, hopDepth, adjacency]);

  // importantOnly 필터링된 그래프
  const viewData = useMemo(() => {
    if (!importantOnly) return data;
    const keep = new Set(
      data.nodes
        .filter((n) => n.type !== 'patent' || n.importance >= 0.8)
        .map((n) => n.id)
    );
    return {
      nodes: data.nodes.filter((n) => keep.has(n.id)),
      edges: data.edges.filter((e) => {
        const s = typeof e.source === 'string' ? e.source : (e.source as any).id;
        const t = typeof e.target === 'string' ? e.target : (e.target as any).id;
        return keep.has(s) && keep.has(t);
      }),
    };
  }, [data, importantOnly]);

  // ForceGraph용 데이터 (edges → links)
  const fgData = useMemo(
    () => ({
      nodes: viewData.nodes,
      links: viewData.edges.map((e) => ({ ...e })),
    }),
    [viewData]
  );

  // 컨테이너 크기 추적
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // 렌즈에 따른 링크 가시성
  const linkVisible = useCallback(
    (link: any) => {
      const type = link.type;
      if (lens === 'citation') return type === 'cites';
      if (lens === 'similar') return type === 'similar_to';
      if (lens === 'applicant') return type === 'filed_by' || type === 'belongs_to';
      if (lens === 'country') return type === 'filed_in' || type === 'belongs_to';
      if (lens === 'field') return type === 'belongs_to';
      return true; // all
    },
    [lens]
  );

  // 색상
  const getNodeColor = useCallback(
    (node: any) => {
      if (highlight && !highlight.has(node.id)) return DIM_NODE;
      return colorOf(node as GraphNode, colorBy);
    },
    [highlight, colorBy]
  );

  const getLinkColor = useCallback(
    (link: any) => {
      if (!highlight) return 'rgba(150,180,220,0.14)';
      const s = typeof link.source === 'string' ? link.source : link.source.id;
      const t = typeof link.target === 'string' ? link.target : link.target.id;
      return highlight.has(s) && highlight.has(t) ? 'rgba(150,200,255,0.55)' : DIM_LINK;
    },
    [highlight]
  );

  // 라벨 (SpriteText)
  const nodeThreeObject = useCallback(
    (node: any) => {
      if (labelMode === 'hidden') return null;
      const isKey =
        node.type === 'field' ||
        node.type === 'country' ||
        node.type === 'subfield' ||
        node.importance >= 0.85;
      if (labelMode === 'important' && !isKey) return null;
      if (highlight && !highlight.has(node.id) && labelMode !== 'all') return null;

      const sprite = new SpriteText(node.label);
      sprite.color = highlight && !highlight.has(node.id) ? 'rgba(200,215,235,0.35)' : '#eaf3ff';
      sprite.textHeight =
        node.type === 'field' ? 5.5 : node.type === 'country' || node.type === 'subfield' ? 3.6 : 2.4;
      sprite.fontFace = 'Helvetica, Arial, sans-serif';
      sprite.backgroundColor = 'rgba(4,8,18,0.5)';
      sprite.padding = 1.5;
      sprite.borderRadius = 2;
      // SpriteText extends THREE.Sprite(→Object3D) at runtime; its bundled types
      // don't surface `position`, so access it through the Object3D shape.
      (sprite as unknown as { position: { set: (x: number, y: number, z: number) => void } }).position.set(
        0,
        Math.cbrt(Math.max(1, node.val)) * 2.4 + 4,
        0
      );
      return sprite;
    },
    [labelMode, highlight]
  );

  // 노드 클릭 → 선택 + 카메라 이동 + 드로어
  const onNodeClick = useCallback(
    (node: any) => {
      setSelected(node.id);
      const fg = fgRef.current;
      if (fg && typeof node.x === 'number') {
        const dist = 90;
        const ratio = 1 + dist / Math.hypot(node.x, node.y, node.z || 1);
        fg.cameraPosition(
          { x: node.x * ratio, y: node.y * ratio, z: (node.z || 0) * ratio },
          node,
          1100
        );
      }
      openDrawer(node.id);
    },
    [openDrawer]
  );

  // 힘/레이아웃 적용
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const charge = spacing === 'compact' ? -55 : spacing === 'wide' ? -240 : -120;
    fg.d3Force('charge')?.strength(charge);
    fg.d3Force('link')?.distance(spacing === 'wide' ? 80 : spacing === 'compact' ? 26 : 46);

    const span = CURRENT_YEAR - 2016 || 1;
    fgData.nodes.forEach((n: any) => {
      if (layout === 'timeline') {
        if (n.year) n.fx = ((n.year - 2016) / span) * 900 - 450;
        else n.fx = undefined;
        n.fy = undefined;
        n.fz = undefined;
      } else if (layout === 'cluster') {
        const idx = FIELDS.findIndex((f) => f.id === n.field);
        if (idx >= 0) {
          const ang = (idx / FIELDS.length) * Math.PI * 2;
          n.fx = Math.cos(ang) * 260;
          n.fz = Math.sin(ang) * 260;
        } else {
          n.fx = undefined;
          n.fz = undefined;
        }
        n.fy = undefined;
      } else {
        n.fx = undefined;
        n.fy = undefined;
        n.fz = undefined;
      }
    });
    fg.d3ReheatSimulation?.();
  }, [spacing, layout, fgData]);

  // 초기 노드 포커스 + 드로어
  useEffect(() => {
    if (!initialNode) return;
    openDrawer(initialNode);
    const fg = fgRef.current;
    const t = setTimeout(() => {
      const n = fgData.nodes.find((x: any) => x.id === initialNode) as any;
      if (fg && n && typeof n.x === 'number') {
        const ratio = 1 + 90 / Math.hypot(n.x, n.y, n.z || 1);
        fg.cameraPosition({ x: n.x * ratio, y: n.y * ratio, z: (n.z || 0) * ratio }, n, 1200);
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNode, fgData]);

  if (!mounted) {
    return <div className={styles.layout} aria-hidden />;
  }

  return (
    <div className={styles.layout}>
      {/* 좌측 컨트롤 패널 */}
      <aside className={styles.panel}>
        <Group title="렌즈">
          <Pills options={LENSES} value={lens} onChange={setLens} />
        </Group>
        <Group title="색상 기준">
          <Pills options={COLOR_BYS} value={colorBy} onChange={setColorBy} />
        </Group>
        <Group title="레이아웃">
          <Pills options={LAYOUTS} value={layout} onChange={setLayout} />
        </Group>
        <Group title="표시 옵션">
          <div className={styles.optRow}>
            <span>라벨</span>
            <Pills
              small
              options={[
                { id: 'important' as LabelMode, label: '주요' },
                { id: 'all' as LabelMode, label: '전체' },
                { id: 'hidden' as LabelMode, label: '숨김' },
              ]}
              value={labelMode}
              onChange={setLabelMode}
            />
          </div>
          <div className={styles.optRow}>
            <span>노드 간격</span>
            <Pills
              small
              options={[
                { id: 'compact' as Spacing, label: '좁게' },
                { id: 'normal' as Spacing, label: '보통' },
                { id: 'wide' as Spacing, label: '넓게' },
              ]}
              value={spacing}
              onChange={setSpacing}
            />
          </div>
          <div className={styles.optRow}>
            <span>이웃 강조</span>
            <Pills
              small
              options={[
                { id: 1 as const, label: '1-hop' },
                { id: 2 as const, label: '2-hop' },
              ]}
              value={hopDepth}
              onChange={setHopDepth}
            />
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={importantOnly}
              onChange={(e) => setImportantOnly(e.target.checked)}
            />
            중요 특허만 보기
          </label>
        </Group>

        <Group title="범례">
          <Legend colorBy={colorBy} />
        </Group>

        {selected && (
          <button className={styles.clear} onClick={() => setSelected(null)}>
            선택 해제
          </button>
        )}
        <div className={styles.count}>
          노드 {viewData.nodes.length} · 엣지 {viewData.edges.length}
        </div>
      </aside>

      {/* 그래프 캔버스 */}
      <div className={styles.canvas} ref={wrapRef}>
        <div className={styles.canvasHead}>
          <span className="page-eyebrow">Graph View</span>
          <span className={styles.canvasHint}>
            노드를 클릭하면 카메라가 이동하고 오른쪽에 보고서가 열립니다
          </span>
        </div>
        <ForceGraph3D
          ref={fgRef}
          graphData={fgData}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(4,7,15,0)"
          showNavInfo={false}
          nodeId="id"
          nodeVal={(n: any) => n.val}
          nodeColor={getNodeColor}
          nodeOpacity={0.92}
          nodeResolution={12}
          nodeLabel={(n: any) => `${TYPE_LABEL[n.type]} · ${n.label}`}
          nodeThreeObjectExtend
          nodeThreeObject={nodeThreeObject}
          linkColor={getLinkColor}
          linkVisibility={linkVisible}
          linkWidth={(l: any) => {
            if (!highlight) return 0.4;
            const s = typeof l.source === 'string' ? l.source : l.source.id;
            const t = typeof l.target === 'string' ? l.target : l.target.id;
            return highlight.has(s) && highlight.has(t) ? 1.4 : 0.3;
          }}
          linkOpacity={0.7}
          enableNodeDrag={false}
          onNodeClick={onNodeClick}
          onBackgroundClick={() => setSelected(null)}
          cooldownTicks={120}
        />
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      {children}
    </div>
  );
}

function Pills<T extends string | number>({
  options,
  value,
  onChange,
  small,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div className={`${styles.pills} ${small ? styles.pillsSmall : ''}`}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          className={`${styles.pill} ${value === o.id ? styles.pillOn : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Legend({ colorBy }: { colorBy: ColorBy }) {
  let items: { c: string; l: string }[] = [];
  if (colorBy === 'field') items = FIELDS.map((f) => ({ c: f.color, l: f.label_ko }));
  else if (colorBy === 'country') items = COUNTRIES.map((c) => ({ c: c.color, l: `${c.code} ${c.label_ko}` }));
  else if (colorBy === 'period')
    items = [
      { c: 'hsl(196,90%,32%)', l: '오래된 특허' },
      { c: 'hsl(196,90%,75%)', l: '최신 특허' },
    ];
  else if (colorBy === 'nodeType')
    items = [
      { c: '#66e7ff', l: '분야' },
      { c: '#88f2a8', l: '세부분야' },
      { c: '#cfe6ff', l: '특허' },
      { c: '#ffd36a', l: '국가' },
      { c: '#b69cff', l: '출원인' },
      { c: '#7fa7ff', l: '키워드' },
    ];
  else items = [{ c: '#b69cff', l: '출원인별 색상' }];

  return (
    <div className={styles.legend}>
      {items.map((it) => (
        <span key={it.l} className={styles.legendItem}>
          <i style={{ background: it.c }} />
          {it.l}
        </span>
      ))}
    </div>
  );
}
