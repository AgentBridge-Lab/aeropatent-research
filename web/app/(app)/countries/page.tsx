import Link from 'next/link';
import styles from './countries.module.css';
import Heatmap from '../../components/viz/Heatmap';
import {
  getCountryComparison,
  COUNTRIES,
  COUNTRY_ORDER,
  CANDIDATE_SCOPE_NOTE,
} from '../../lib/data';
import type { CountryCode } from '../../lib/data';

export const metadata = { title: '공개 관할 비교 · AEROPATENT' };

export default async function CountriesPage() {
  const data = getCountryComparison();

  // 총량 기준 최댓값 (막대 비율 계산용)
  const maxCount = Math.max(...data.totals.map((t) => t.count), 1);

  return (
    <div>
      {/* ── 페이지 헤더 ── */}
      <div className={styles.head}>
        <span className="page-eyebrow">Jurisdiction Comparison</span>
        <h1 className="page-title">공개 관할별 항공우주 특허 현황</h1>
        <p className={styles.sub}>
          US·EP·JP·CN·KR 5개 공개 관할의 패밀리 규모를 분야별로 비교합니다. 공개 관할 기준
          집계이므로 출원인 소재국이나 국가 기술력 순위로 해석하면 안 됩니다. {CANDIDATE_SCOPE_NOTE}.
        </p>
      </div>

      {/* ── 섹션 1: 공개 관할별 총량 ── */}
      <h2 className={styles.sectionLabel}>공개 관할별 총량 비교</h2>
      <div className={styles.totalCard}>
        <div className={styles.cardTitle}>패밀리 수 (최근 10년 우선권 · 공개 관할 기준)</div>
        <div className={styles.cardMeta}>
          US · EP · JP · CN · KR 고정 순서 · 막대 길이는 최대값 대비 비율 · {CANDIDATE_SCOPE_NOTE}
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
                <div className={styles.barVal}>{count.toLocaleString()}건</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 섹션 2: 분야 × 공개 관할 히트맵 ── */}
      <h2 className={styles.sectionLabel}>분야 × 공개 관할 히트맵</h2>
      <div className={styles.heatCard}>
        <div className={styles.cardTitle}>분야 × 공개 관할 히트맵</div>
        <div className={styles.cardMeta}>행: 분야 · 열: 공개 관할 · 색 농도: 행 기준 밀도 · 최근 10년 우선권</div>
        <Heatmap cells={data.heatmap} />
      </div>

      {/* ── 섹션 3: 상위 분야 + 한국 대비 수치 ── */}
      <h2 className={styles.sectionLabel}>공개 관할별 상위 분야 + KR 대비 수치</h2>
      <div className={styles.gapCard}>
        <div className={styles.cardTitle}>상위 분야 3개 및 KR 공개 관할 대비 수치</div>
        <div className={styles.cardMeta}>최근 10년 우선권 · 공개 관할 기준 실측 집계</div>
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
                    <span className={styles.gapFieldCount}>{count.toLocaleString()}건</span>
                  </div>
                ))}
              </div>
              <div className={styles.gapVs}>{profile.vs_korea}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 섹션 4: 공개 관할 카드 그리드 ── */}
      <h2 className={styles.sectionLabel}>공개 관할 카드</h2>
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

            {/* 총 패밀리 */}
            <div className={styles.countryStats}>
              <div className={styles.statBlock}>
                <span className={styles.statValue}>{profile.total.toLocaleString()}</span>
                <span className={styles.statLabel}>패밀리 (최근 10년 우선권)</span>
              </div>
            </div>

            {/* 상위 분야 칩 */}
            <div className={styles.subSection}>
              <div className={styles.subHead}>상위 분야</div>
              <div className={styles.fieldChips}>
                {profile.strong_fields.map(({ field, count }) => (
                  <span key={field.id} className={styles.fieldChip}>
                    <span
                      className={styles.chipDot}
                      style={{ background: field.color }}
                    />
                    {field.label_ko}
                    <span className={styles.chipCount}>{count.toLocaleString()}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* 대표 특허 (표본) */}
            <div className={styles.subSection}>
              <div className={styles.subHead}>대표 특허 (표본 문헌)</div>
              <div className={styles.patentLinks}>
                {profile.top_patents.length === 0 ? (
                  <span className={styles.statLabel}>표본 내 문헌 없음</span>
                ) : (
                  profile.top_patents.map((patent) => (
                    <Link
                      key={patent.id}
                      href={`/patents/${encodeURIComponent(patent.publication_number)}`}
                      className={styles.patentLink}
                    >
                      <span className={styles.patentLinkPub}>{patent.publication_number}</span>
                      <span className={styles.patentLinkTitle}>{patent.title}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* KR 대비 수치 */}
            <div className={styles.vsKorea}>
              <div className={styles.vsLabel}>KR 공개 관할 대비</div>
              {profile.vs_korea}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
