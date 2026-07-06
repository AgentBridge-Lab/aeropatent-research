import Link from 'next/link';
import styles from './analysis.module.css';
import KpiRow from '../../components/viz/KpiRow';
import CountryBars from '../../components/viz/CountryBars';
import TrendArea from '../../components/viz/TrendArea';
import Heatmap from '../../components/viz/Heatmap';
import { Insights, KeywordChips } from '../../components/viz/Insights';
import {
  parseFilter,
  getSummary,
  filterToQuery,
  fieldFamilyCount,
  FIELDS,
  COUNTRIES,
} from '../../lib/data';

export const metadata = { title: '분석 홈 · AEROPATENT' };

export default async function AnalysisPage() {
  const filter = parseFilter();
  const s = getSummary(filter);
  const query = filterToQuery(filter).replace(/^\?/, '');
  const leadName = COUNTRIES.find((c) => c.code === s.leading_country)?.label_ko ?? s.leading_country;

  // 분야별 건수(현재 필터 기준)
  const fieldCounts = FIELDS.map((f) => ({
    field: f,
    count: fieldFamilyCount(f.id, filter),
  }));

  return (
    <div>
      <div className={styles.head}>
        <span className="page-eyebrow">Analysis</span>
        <h1 className="page-title">항공우주 특허 분석 리포트</h1>
        <p className={styles.summary}>
          현재 조건에서 항공우주 특허는 위성 플랫폼, 우주통신, 재사용 발사체 분야를 중심으로
          빠르게 증가하고 있습니다. 결론을 먼저 확인하고, 관심 분야를 선택해 그래프와 원문 근거로
          내려가세요.
        </p>
      </div>

      <div className={styles.kpis}>
        <KpiRow
          kpis={[
            { label: '총 특허 수', value: s.total_patents.toLocaleString(), unit: '건', accent: 'var(--cyan)' },
            { label: '최근 증가율', value: `+${s.growth_rate}`, unit: '%', accent: 'var(--green)', foot: '기간 내 후반 vs 전반' },
            { label: '선도 국가', value: s.leading_country, foot: leadName, accent: 'var(--amber)' },
            { label: '핵심 클러스터', value: String(s.cluster_count), unit: '개', accent: 'var(--violet)', foot: '특허 3건 이상 세부분야' },
          ]}
        />
      </div>

      <div className={styles.charts}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>국가별 분포</div>
          <div className={styles.cardMeta}>US · EP · JP · CN · KR 고정 순서</div>
          <CountryBars data={s.country_distribution} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>기간별 추세</div>
          <div className={styles.cardMeta}>연도별 신규 출원 건수</div>
          <TrendArea data={s.yearly_trend} />
        </div>
        <div className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardTitle}>분야 × 국가 클러스터 히트맵</div>
          <div className={styles.cardMeta}>행: 분야 · 열: 국가 · 색 농도: 행 기준 출원 밀도</div>
          <Heatmap cells={s.field_heatmap} />
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>급상승 키워드</div>
          <div className={styles.cardMeta}>최근 2년 출원 기준 상위 키워드</div>
          <KeywordChips items={s.rising_keywords} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>핵심 인사이트</div>
          <div className={styles.cardMeta}>분석 조건 기준 요약</div>
          <Insights items={s.insights} />
        </div>
      </div>

      <h2 className={styles.sectionLabel}>분야별 상세 분석</h2>
      <div className={styles.fields}>
        {fieldCounts.map(({ field, count }) => (
          <Link
            key={field.id}
            href={`/analysis/${field.id}${query ? `?${query}` : ''}`}
            className={styles.fieldCard}
            style={{ borderLeftColor: field.color }}
          >
            <div className={styles.fieldTop}>
              <span className={styles.fieldName}>{field.label_ko}</span>
              <span className={styles.fieldCount} style={{ color: field.color }}>
                {count}건
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
