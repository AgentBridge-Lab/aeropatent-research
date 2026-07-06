import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from './field.module.css';
import KpiRow from '../../../components/viz/KpiRow';
import CountryBars from '../../../components/viz/CountryBars';
import TrendArea from '../../../components/viz/TrendArea';
import { Insights } from '../../../components/viz/Insights';
import PatentCard from '../../../components/PatentCard';
import {
  parseFilter,
  filterToQuery,
  getFieldAnalysis,
  COUNTRIES,
  FIELDS,
  type FieldId,
  type Filter,
} from '../../../lib/data';

export const metadata = { title: '분야 상세 분석 · AEROPATENT' };

export function generateStaticParams() {
  return FIELDS.map((field) => ({ fieldId: field.id }));
}

export default async function FieldAnalysisPage({
  params,
}: {
  params: Promise<{ fieldId: string }>;
}) {
  const { fieldId } = await params;
  const filter = parseFilter();
  const fa = getFieldAnalysis(fieldId as FieldId, filter);

  if (!fa) notFound();

  const query = filterToQuery(filter).replace(/^\?/, '');
  const leadName =
    COUNTRIES.find((c) => c.code === fa.leading_country)?.label_ko ?? fa.leading_country;

  const topCount = fa.top_applicants[0]?.count ?? 1;

  // CTA URLs
  const ctaFilter: Partial<Filter> = { ...filter, field: fieldId as FieldId };
  const ctaQuery = filterToQuery(ctaFilter);
  const graphUrl = `/graph${ctaQuery}`;
  const patentsUrl = `/patents${ctaQuery}`;
  const reportUrl = `/reports/field.${fieldId}${ctaQuery}`;

  return (
    <div>
      {/* ── Header ── */}
      <div className={styles.head}>
        <span className="page-eyebrow" style={{ color: fa.field.color }}>
          {fa.field.label_en}
        </span>
        <h1 className="page-title">{fa.field.label_ko} 특허 분석</h1>
        <p className={styles.oneLine}>{fa.one_line}</p>
      </div>

      {/* ── KPI 4개 ── */}
      <div className={styles.kpis}>
        <KpiRow
          kpis={[
            {
              label: '특허 수',
              value: fa.total.toLocaleString(),
              unit: '건',
              accent: 'var(--cyan)',
            },
            {
              label: '증가율',
              value: `+${fa.growth_rate}`,
              unit: '%',
              accent: 'var(--green)',
              foot: '기간 내 후반 vs 전반',
            },
            {
              label: '선도국',
              value: fa.leading_country,
              foot: leadName,
              accent: 'var(--amber)',
            },
            {
              label: '한국 비중',
              value: `${Math.round(fa.kr_share * 100)}`,
              unit: '%',
              accent: 'var(--violet)',
              foot: '전체 출원 대비 KR',
            },
          ]}
        />
      </div>

      {/* ── 차트 2열 그리드 ── */}
      <div className={styles.charts}>
        {/* 국가별 비교 */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>국가별 비교</div>
          <div className={styles.cardMeta}>US · EP · JP · CN · KR 고정 순서</div>
          <CountryBars data={fa.country_distribution} />
        </div>

        {/* 기간별 추세 */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>기간별 추세</div>
          <div className={styles.cardMeta}>연도별 신규 출원 건수</div>
          <TrendArea data={fa.yearly_trend} color={fa.field.color} />
        </div>
      </div>

      {/* ── 주요 출원인 ── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>주요 출원인</div>
        <div className={styles.cardMeta}>출원 건수 기준 상위 {fa.top_applicants.length}개 기관</div>
        <div className={styles.applicants}>
          {fa.top_applicants.map((a) => {
            const barPct = topCount > 0 ? (a.count / topCount) * 100 : 0;
            return (
              <div key={a.id} className={styles.applicantRow}>
                <div className={styles.applicantMeta}>
                  <span className={styles.applicantName}>{a.name}</span>
                  <span className={styles.applicantCode}>{a.country}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${barPct}%`,
                      background: fa.field.color,
                    }}
                  />
                </div>
                <div className={styles.applicantCount}>{a.count}건</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 세부기술 클러스터 ── */}
      <div className={styles.card} style={{ marginTop: 16 }}>
        <div className={styles.cardTitle}>세부기술 클러스터</div>
        <div className={styles.cardMeta}>세부 분야별 출원 건수 및 비중</div>
        <div className={styles.clusters}>
          {fa.subfield_clusters.map(({ subfield, count, share }) => {
            const maxCount = fa.subfield_clusters[0]?.count ?? 1;
            const barPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={subfield.id} className={styles.clusterRow}>
                <div className={styles.clusterLabel}>{subfield.label_ko}</div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${barPct}%`,
                      background: fa.field.color,
                      opacity: 0.85,
                    }}
                  />
                </div>
                <div className={styles.clusterStat}>
                  <span className={styles.clusterCount}>{count}건</span>
                  <span className={styles.clusterShare}>{Math.round(share * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 핵심 인사이트 ── */}
      <div className={styles.card} style={{ marginTop: 16 }}>
        <div className={styles.cardTitle}>핵심 인사이트</div>
        <div className={styles.cardMeta}>분석 조건 기준 요약</div>
        <Insights items={fa.insights} />
      </div>

      {/* ── 주요 특허 5개 ── */}
      <h2 className={styles.sectionLabel}>주요 특허</h2>
      <div className={styles.patents}>
        {fa.top_patents.map((p) => (
          <PatentCard key={p.id} patent={p} query={query} />
        ))}
      </div>

      {/* ── CTA 버튼 ── */}
      <div className={styles.cta}>
        <Link href={graphUrl} className={styles.ctaBtn}>
          Graph View에서 보기
        </Link>
        <Link href={patentsUrl} className={styles.ctaBtnSecondary}>
          관련 특허 검색
        </Link>
        <Link href={reportUrl} className={styles.ctaBtnSecondary}>
          상세 보고서 생성
        </Link>
      </div>
    </div>
  );
}
