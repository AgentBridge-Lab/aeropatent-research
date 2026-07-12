import Link from 'next/link';
import styles from './report.module.css';
import KpiRow from '../../../components/viz/KpiRow';
import CountryBars from '../../../components/viz/CountryBars';
import TrendArea from '../../../components/viz/TrendArea';
import { Insights } from '../../../components/viz/Insights';
import PatentCard from '../../../components/PatentCard';
import {
  parseFilter,
  filterToQuery,
  getFieldAnalysis,
  FIELDS,
  SUBFIELDS,
  COUNTRIES,
  COUNTRY_ORDER,
  PATENTS,
} from '../../../lib/data';
import { getNodeReport } from '../../../lib/graph';
import type { FieldId } from '../../../lib/data';

export function generateStaticParams() {
  return [
    ...FIELDS.map((field) => ({ reportId: `field.${field.id}` })),
    ...SUBFIELDS.map((subfield) => ({ reportId: `subfield.${subfield.id}` })),
    ...COUNTRIES.map((country) => ({ reportId: `country.${country.code}` })),
    ...PATENTS.map((patent) => ({ reportId: patent.id })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const nodeId = decodeURIComponent(reportId);
  const report = getNodeReport(nodeId, parseFilter());
  return { title: `${report?.title ?? nodeId} · AEROPATENT` };
}

const NODE_TYPE_LABEL: Record<string, string> = {
  field: '분야',
  subfield: '세부분야',
  patent: '특허',
  country: '국가',
  applicant: '출원인',
  keyword: '키워드',
};

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionNum}>{num}</span>
      <span className={styles.sectionTitle}>{title}</span>
    </div>
  );
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const nodeId = decodeURIComponent(reportId);
  const filter = parseFilter();
  const query = filterToQuery(filter).replace(/^\?/, '');

  const report = getNodeReport(nodeId, filter);

  if (!report) {
    return (
      <div className={styles.notFound}>
        <div className={styles.notFoundTitle}>보고서를 찾을 수 없습니다</div>
        <Link href={`/reports${query ? `?${query}` : ''}`} className={styles.notFoundLink}>
          ← 보고서 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  // Enrich with FieldAnalysis if this is a field node
  const isFieldNode = nodeId.startsWith('field.');
  const fa = isFieldNode
    ? getFieldAnalysis(nodeId.slice('field.'.length) as FieldId, filter)
    : null;

  const isPatentNode = report.node_type === 'patent';
  const typeLabel = NODE_TYPE_LABEL[report.node_type] ?? report.node_type;

  // Build filter description pills
  const filterPills: { label: string; value: string }[] = [];
  {
    const fieldObj = filter.field !== 'all' ? FIELDS.find((f) => f.id === filter.field) : null;
    filterPills.push({ label: '분야', value: fieldObj ? fieldObj.label_ko : '전체' });
    filterPills.push({
      label: '국가',
      value:
        filter.countries.length === COUNTRY_ORDER.length
          ? '전체'
          : filter.countries
              .map((c) => COUNTRIES.find((x) => x.code === c)?.label_ko ?? c)
              .join(', '),
    });
    filterPills.push({
      label: '기간',
      value: filter.period === '5y' ? '최근 5년' : filter.period === '10y' ? '최근 10년' : '전체',
    });
  }

  // Max count for cluster bar normalisation
  const maxClusterCount =
    fa && fa.subfield_clusters.length > 0
      ? Math.max(...fa.subfield_clusters.map((c) => c.count), 1)
      : 1;

  return (
    <div>
      {/* Back link */}
      <Link href={`/reports${query ? `?${query}` : ''}`} className={styles.back}>
        ← 보고서 목록
      </Link>

      {/* Header */}
      <div className={styles.head}>
        <div className={styles.typeTag}>{typeLabel}</div>
        <h1 className={styles.title}>{report.title}</h1>
        <p className={styles.oneLine}>{report.one_line_conclusion}</p>
      </div>

      {/* Top CTA bar */}
      <div className={styles.ctaBar}>
        <Link
          href={`/patents${query ? `?${query}` : ''}`}
          className={styles.ctaBtn}
        >
          관련 특허 검색
        </Link>
        {!isPatentNode && (
          <Link
            href={`/graph?node=${encodeURIComponent(nodeId)}${query ? `&${query}` : ''}`}
            className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}
          >
            그래프에서 보기 →
          </Link>
        )}
      </div>

      {/* §1 Executive Summary */}
      <div className={styles.section}>
        <SectionHeader num={1} title="Executive Summary" />
        <p className={styles.summaryText}>
          {report.one_line_conclusion}
          {report.insights.length > 0 && (
            <>
              {' '}
              {report.insights.slice(0, 2).join(' ')}
            </>
          )}
        </p>
      </div>

      {/* §2 분석 조건 */}
      <div className={styles.section}>
        <SectionHeader num={2} title="분석 조건" />
        <div className={styles.filterPills}>
          {filterPills.map((p) => (
            <span key={p.label} className={styles.pill}>
              <span className={styles.pillLabel}>{p.label}</span>
              {p.value}
            </span>
          ))}
        </div>
      </div>

      {/* §3 핵심 지표 */}
      {report.kpis.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={3} title="핵심 지표" />
          <KpiRow kpis={report.kpis.map((k) => ({ label: k.label, value: k.value }))} />
        </div>
      )}

      {/* §4 국가별 비교 */}
      {report.country_distribution.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={4} title="국가별 비교" />
          <CountryBars data={report.country_distribution} />
        </div>
      )}

      {/* §5 기간별 추세 */}
      {report.yearly_trend.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={5} title="기간별 추세" />
          <TrendArea data={report.yearly_trend} />
        </div>
      )}

      {/* §6 세부기술 클러스터 (field nodes only) */}
      {fa && fa.subfield_clusters.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={6} title="세부기술 클러스터" />
          <div className={styles.clusterBars}>
            {fa.subfield_clusters.map((c) => (
              <div key={c.subfield.id} className={styles.clusterRow}>
                <span className={styles.clusterLabel}>{c.subfield.label_ko}</span>
                <div className={styles.clusterTrack}>
                  <div
                    className={styles.clusterFill}
                    style={{ width: `${(c.count / maxClusterCount) * 100}%` }}
                  />
                </div>
                <span className={styles.clusterCount}>{c.count}건</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* §7 주요 출원인 (field nodes only) */}
      {fa && fa.top_applicants.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={7} title="주요 출원인" />
          <div className={styles.applicantList}>
            {fa.top_applicants.map((a) => (
              <div key={a.id} className={styles.applicantRow}>
                <span className={styles.applicantName}>{a.name}</span>
                <span className={styles.applicantCountry}>{a.country}</span>
                <span className={styles.applicantCount}>{a.count}건</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* §8 주요 특허 */}
      {report.top_patents.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={8} title="주요 특허" />
          <ol className={styles.patentList}>
            {report.top_patents.map((patent) => (
              <li key={patent.id}>
                <PatentCard patent={patent} query={query} />
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* §9 전략적 시사점 */}
      {report.insights.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={9} title="전략적 시사점" />
          <Insights items={report.insights} />
        </div>
      )}

      {/* §10 근거 및 원문 링크 */}
      <div className={styles.section}>
        <SectionHeader num={10} title="근거 및 원문 링크" />
        {report.evidence && report.evidence.length > 0 ? (
          <details className={styles.evidenceDetails}>
            <summary>근거 원문 펼치기</summary>
            <div className={styles.evidenceBody}>
              {report.evidence.map((e, i) => (
                <div key={i} className={styles.evidenceItem}>
                  <div className={styles.evidenceItemLabel}>{e.label}</div>
                  <p>{e.text}</p>
                </div>
              ))}
            </div>
          </details>
        ) : (
          <p className={styles.evidenceNote}>
            각 특허의 근거 및 원문은 주요 특허 섹션의 &quot;특허 상세&quot; 링크에서 확인할 수
            있습니다.
          </p>
        )}
      </div>
    </div>
  );
}
