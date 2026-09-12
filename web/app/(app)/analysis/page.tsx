import Link from 'next/link';
import styles from './analysis.module.css';
import KpiRow from '../../components/viz/KpiRow';
import CountryBars from '../../components/viz/CountryBars';
import TrendArea from '../../components/viz/TrendArea';
import Heatmap from '../../components/viz/Heatmap';
import { Insights } from '../../components/viz/Insights';
import {
  getSummary,
  FIELDS,
  COUNTRIES,
  CANDIDATE_SCOPE_NOTE,
  TREND_BASIS_NOTE,
} from '../../lib/data';

export const metadata = { title: '분석 홈 · AEROPATENT' };

export default async function AnalysisPage() {
  const s = getSummary();
  const leadName = COUNTRIES.find((c) => c.code === s.leading_country)?.label_ko ?? s.leading_country;

  // 분야별 전체 기간 실측 패밀리 수
  const fieldCounts = FIELDS.map((f) => ({
    field: f,
    count: f.family_count,
  }));

  return (
    <div>
      <div className={styles.head}>
        <span className="page-eyebrow">Analysis</span>
        <h1 className="page-title">항공우주 특허 분석 리포트</h1>
        <p className={styles.summary}>
          BigQuery 실측 집계 기준 항공우주 CPC 후보군의 규모와 공개 관할 분포를 보여줍니다.
          모든 수치는 {CANDIDATE_SCOPE_NOTE}이며, 관심 분야를 선택해 그래프와 원문 근거로
          내려가세요.
        </p>
      </div>

      <div className={styles.kpis}>
        <KpiRow
          kpis={[
            { label: '고유 패밀리', value: s.total_patents.toLocaleString(), unit: '개', accent: 'var(--cyan)', foot: '전체 기간 · 분야 중복 제거' },
            { label: '공개 문헌', value: s.publication_count.toLocaleString(), unit: '건', accent: 'var(--green)', foot: '전체 기간' },
            { label: '최대 공개 관할', value: s.leading_country, foot: leadName, accent: 'var(--amber)' },
            { label: '분류 분야', value: String(s.field_count), unit: '개', accent: 'var(--violet)', foot: 'CPC 후보군 분류' },
          ]}
        />
        <p className={styles.scopeNote}>{CANDIDATE_SCOPE_NOTE} · 공개 관할 기준</p>
      </div>

      <div className={styles.charts}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>공개 관할별 분포</div>
          <div className={styles.cardMeta}>US · EP · JP · CN · KR 고정 순서 · 전체 기간</div>
          <CountryBars data={s.country_distribution} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>연도별 패밀리 추세</div>
          <div className={styles.cardMeta}>전체 후보군 · {TREND_BASIS_NOTE} · 진행 중 연도 제외</div>
          <TrendArea data={s.yearly_trend} />
        </div>
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardTitle}>분야 × 공개 관할 히트맵</div>
          <div className={styles.cardMeta}>행: 분야 · 열: 공개 관할 · 색 농도: 행 기준 밀도 · 전체 기간</div>
          <Heatmap cells={s.field_heatmap} />
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardTitle}>핵심 인사이트</div>
          <div className={styles.cardMeta}>실측 집계 기준 요약</div>
          <Insights items={s.insights} />
        </div>
      </div>

      <h2 className={styles.sectionLabel}>분야별 상세 분석</h2>
      <div className={styles.fields}>
        {fieldCounts.map(({ field, count }) => (
          <Link
            key={field.id}
            href={`/analysis/${field.id}`}
            className={styles.fieldCard}
            style={{ borderLeftColor: field.color }}
          >
            <div className={styles.fieldTop}>
              <span className={styles.fieldName}>{field.label_ko}</span>
              <span className={styles.fieldCount} style={{ color: field.color }}>
                {count.toLocaleString()}건
              </span>
            </div>
            <p className={styles.fieldSummary}>{field.summary_ko}</p>
            <div className={styles.fieldArrow}>상세 분석 보기 →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
