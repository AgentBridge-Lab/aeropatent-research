import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from './field.module.css';
import KpiRow from '../../../components/viz/KpiRow';
import CountryBars from '../../../components/viz/CountryBars';
import TrendArea from '../../../components/viz/TrendArea';
import { Insights } from '../../../components/viz/Insights';
import PatentCard from '../../../components/PatentCard';
import {
  filterToQuery,
  getFieldAnalysis,
  COUNTRIES,
  FIELDS,
  YEARLY_FAMILY_TREND,
  CANDIDATE_SCOPE_NOTE,
  TREND_BASIS_NOTE,
  SAMPLE_BASIS_NOTE,
  type FieldId,
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
  const fa = getFieldAnalysis(fieldId as FieldId);

  if (!fa) notFound();

  const leadName =
    COUNTRIES.find((c) => c.code === fa.leading_country)?.label_ko ?? fa.leading_country;

  const topCount = fa.top_applicants[0]?.count ?? 1;

  // CTA URLs — 필터는 표본 기반 검색·그래프 화면에만 적용된다.
  const ctaQuery = filterToQuery({ field: fieldId as FieldId });
  const graphUrl = `/graph${ctaQuery}`;
  const patentsUrl = `/patents${ctaQuery}`;
  const reportUrl = `/reports/field.${fieldId}`;

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
              label: '패밀리 수',
              value: fa.total.toLocaleString(),
              unit: '건',
              accent: 'var(--cyan)',
              foot: `전체 기간 · ${CANDIDATE_SCOPE_NOTE}`,
            },
            {
              label: '최근 5년 패밀리',
              value: fa.recent5_family_count.toLocaleString(),
              unit: '건',
              accent: 'var(--green)',
              foot: '실측 집계',
            },
            {
              label: '최대 공개 관할',
              value: fa.leading_country,
              foot: leadName,
              accent: 'var(--amber)',
            },
            {
              label: '한국 비중',
              value: `${Math.round(fa.kr_share * 100)}`,
              unit: '%',
              accent: 'var(--violet)',
              foot: '표시 5개 공개 관할 내 KR',
            },
          ]}
        />
      </div>

      {/* ── 차트 2열 그리드 ── */}
      <div className={styles.charts}>
        {/* 공개 관할별 비교 */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>공개 관할별 비교</div>
          <div className={styles.cardMeta}>US · EP · JP · CN · KR 고정 순서 · 전체 기간</div>
          <CountryBars data={fa.country_distribution} />
        </div>

        {/* 기간별 추세 (전체 후보군) */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>연도별 패밀리 추세 (전체 후보군)</div>
          <div className={styles.cardMeta}>
            분야별 연도 추세는 집계에 없어 전체 후보군 추세만 표시합니다. {TREND_BASIS_NOTE}
          </div>
          <TrendArea data={YEARLY_FAMILY_TREND} color={fa.field.color} />
        </div>
      </div>

      {/* ── 주요 출원인 ── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>주요 출원인</div>
        <div className={styles.cardMeta}>
          BigQuery 실측 상위 {fa.top_applicants.length}개 기관 (출원인 명칭 정규화 전)
        </div>
        <div className={styles.applicants}>
          {fa.top_applicants.map((a) => {
            const barPct = topCount > 0 ? (a.count / topCount) * 100 : 0;
            return (
              <div key={a.name} className={styles.applicantRow}>
                <div className={styles.applicantMeta}>
                  <span className={styles.applicantName}>{a.name}</span>
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
                <div className={styles.applicantCount}>{a.count.toLocaleString()}건</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 세부기술 클러스터 (표본 기준) ── */}
      <div className={styles.card} style={{ marginTop: 16 }}>
        <div className={styles.cardTitle}>세부기술 클러스터</div>
        <div className={styles.cardMeta}>{SAMPLE_BASIS_NOTE}</div>
        {fa.subfield_clusters.length === 0 ? (
          <p className={styles.cardMeta}>표본 내 해당 분야 문헌이 없습니다.</p>
        ) : (
          <div className={styles.clusters}>
            {fa.subfield_clusters.map(({ subfield, count }) => {
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 핵심 인사이트 ── */}
      <div className={styles.card} style={{ marginTop: 16 }}>
        <div className={styles.cardTitle}>핵심 인사이트</div>
        <div className={styles.cardMeta}>분야 개요 및 검토 포인트</div>
        <Insights items={fa.insights} />
      </div>

      {/* ── 주요 특허 (표본) ── */}
      <h2 className={styles.sectionLabel}>대표 특허 (표본 문헌)</h2>
      <div className={styles.patents}>
        {fa.top_patents.map((p) => (
          <PatentCard key={p.id} patent={p} />
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
