import Link from 'next/link';
import styles from './countries.module.css';
import Heatmap from '../../components/viz/Heatmap';
import {
  parseFilter,
  filterToQuery,
  getCountryComparison,
  COUNTRIES,
  COUNTRY_ORDER,
} from '../../lib/data';
import type { CountryCode } from '../../lib/data';

export const metadata = { title: '국가 비교 · AEROPATENT' };

export default async function CountriesPage() {
  const filter = parseFilter();
  const data = getCountryComparison(filter);
  const query = filterToQuery(filter).replace(/^\?/, '');

  // 총량 기준 최댓값 (막대 비율 계산용)
  const maxCount = Math.max(...data.totals.map((t) => t.count), 1);

  return (
    <div>
      {/* ── 페이지 헤더 ── */}
      <div className={styles.head}>
        <span className="page-eyebrow">Country Comparison</span>
        <h1 className="page-title">국가별 항공우주 특허 경쟁력</h1>
        <p className={styles.sub}>
          미국·유럽·일본·중국·한국 5개국의 항공우주 특허 출원 현황을 분야별로 비교하고,
          한국의 기술 공백 및 추격 기회를 분석합니다.
        </p>
      </div>

      {/* ── 섹션 1: 국가별 총량 ── */}
      <h2 className={styles.sectionLabel}>국가별 총량 비교</h2>
      <div className={styles.totalCard}>
        <div className={styles.cardTitle}>출원 건수 (현재 필터 기준)</div>
        <div className={styles.cardMeta}>
          US · EP · JP · CN · KR 고정 순서 · 막대 길이는 최대값 대비 비율
        </div>
        <div className={styles.bars}>
          {COUNTRY_ORDER.map((code: CountryCode) => {
            const entry = data.totals.find((t) => t.country.code === code);
            const country = COUNTRIES.find((c) => c.code === code)!;
            const count = entry?.count ?? 0;
            const pct = Math.round((count / maxCount) * 100);
            return (
              <div key={code} className={styles.barRow}>
                <div className={styles.barLabel}>
                  <span
                    className={styles.barDot}
                    style={{ background: country.color }}
                  />
                  <span
                    className={styles.barCode}
                    style={{ borderColor: country.color + '55', color: country.color }}
                  >
                    {code}
                  </span>
                  {country.label_ko}
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${pct}%`, background: country.color }}
                  />
                </div>
                <div className={styles.barVal}>{count}건</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 섹션 2: 분야 × 국가 히트맵 ── */}
      <h2 className={styles.sectionLabel}>분야 × 국가 히트맵</h2>
      <div className={styles.heatCard}>
        <div className={styles.cardTitle}>분야 × 국가 클러스터 히트맵</div>
        <div className={styles.cardMeta}>행: 분야 · 열: 국가 · 색 농도: 행 기준 출원 밀도</div>
        <Heatmap cells={data.heatmap} />
      </div>

      {/* ── 섹션 3: 강점 분야 + 한국 대비 공백 ── */}
      <h2 className={styles.sectionLabel}>국가별 강점 분야 순위 + 한국 대비 공백</h2>
      <div className={styles.gapCard}>
        <div className={styles.cardTitle}>강점 분야 상위 3개 및 한국 대비 시사점</div>
        <div className={styles.cardMeta}>각 국가의 특허 집중 분야와 한국 공백 후보 영역</div>
        <div className={styles.gapGrid}>
          {data.profiles.map((profile) => (
            <div
              key={profile.country.code}
              className={styles.gapCountry}
              style={{ borderTopColor: profile.country.color }}
            >
              <div
                className={styles.gapCountryName}
                style={{ color: profile.country.color }}
              >
                {profile.country.label_ko}
              </div>
              <div className={styles.gapFields}>
                {profile.strong_fields.map(({ field, count }, idx) => (
                  <div key={field.id} className={styles.gapFieldRow}>
                    <span className={styles.gapFieldName}>
                      <span
                        className={styles.gapDot}
                        style={{ background: field.color }}
                      />
                      <span style={{ color: idx === 0 ? 'var(--text)' : 'var(--muted)' }}>
                        {field.label_ko}
                      </span>
                    </span>
                    <span className={styles.gapFieldCount}>{count}건</span>
                  </div>
                ))}
              </div>
              <div className={styles.gapVs}>{profile.vs_korea}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 섹션 4: 국가 카드 그리드 ── */}
      <h2 className={styles.sectionLabel}>국가 카드</h2>
      <div className={styles.countryGrid}>
        {data.profiles.map((profile) => (
          <div
            key={profile.country.code}
            className={styles.countryCard}
            style={{ borderTopColor: profile.country.color }}
          >
            {/* 헤더 */}
            <div className={styles.countryCardHead}>
              <span className={styles.countryName} style={{ color: profile.country.color }}>
                {profile.country.label_ko}
              </span>
              <span className={styles.countryCode}>{profile.country.code}</span>
            </div>

            {/* 총 특허 + 증가율 */}
            <div className={styles.countryStats}>
              <div className={styles.statBlock}>
                <span className={styles.statValue}>{profile.total}</span>
                <span className={styles.statLabel}>총 특허 수</span>
              </div>
              <span className={styles.growthBadge}>
                +{profile.growth_rate}%
              </span>
            </div>

            {/* 강점 분야 칩 */}
            <div className={styles.subSection}>
              <div className={styles.subHead}>강점 분야</div>
              <div className={styles.fieldChips}>
                {profile.strong_fields.map(({ field, count }) => (
                  <span key={field.id} className={styles.fieldChip}>
                    <span
                      className={styles.chipDot}
                      style={{ background: field.color }}
                    />
                    {field.label_ko}
                    <span className={styles.chipCount}>{count}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* 주요 출원인 */}
            <div className={styles.subSection}>
              <div className={styles.subHead}>주요 출원인</div>
              <div className={styles.applicantList}>
                {profile.top_applicants.map((applicant) => (
                  <div key={applicant.id} className={styles.applicantRow}>
                    <span className={styles.applicantName}>{applicant.name}</span>
                    <span className={styles.applicantCount}>{applicant.count}건</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 대표 특허 */}
            <div className={styles.subSection}>
              <div className={styles.subHead}>대표 특허</div>
              <div className={styles.patentLinks}>
                {profile.top_patents.map((patent) => (
                  <Link
                    key={patent.id}
                    href={`/patents/${encodeURIComponent(patent.publication_number)}${query ? `?${query}` : ''}`}
                    className={styles.patentLink}
                  >
                    <span className={styles.patentLinkPub}>{patent.publication_number}</span>
                    <span className={styles.patentLinkTitle}>{patent.title}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* 한국 대비 시사점 */}
            <div className={styles.vsKorea}>
              <div className={styles.vsLabel}>한국 대비 시사점</div>
              {profile.vs_korea}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
