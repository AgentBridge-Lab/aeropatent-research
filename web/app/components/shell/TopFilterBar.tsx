'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from './TopFilterBar.module.css';
import { FIELDS, COUNTRY_ORDER, parseFilter, filterToQuery } from '../../lib/data';
import type { CountryCode, FieldId, Period } from '../../lib/data';

const PERIODS: { id: Period; label: string }[] = [
  { id: '5y', label: '최근 5년' },
  { id: '10y', label: '최근 10년' },
  { id: 'all', label: '전체' },
];

// 분석·국가 비교·보고서 화면은 전체 기간 고정 기준 실측 집계를 보여주므로
// URL 필터를 적용하지 않는다 (P0-3: 표시 조건과 계산 조건 일치).
const FIXED_BASIS_PREFIXES = ['/analysis', '/countries', '/reports'];

export default function TopFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = parseFilter(Object.fromEntries(searchParams.entries()));
  const [q, setQ] = useState('');

  const isFixedBasis = FIXED_BASIS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );

  // 필터 변경 → 현재 경로 유지 + query 갱신 (검색 등 비필터 파라미터는 보존)
  const push = (next: Partial<typeof filter>) => {
    const merged = { ...filter, ...next };
    const base = filterToQuery(merged); // ?field=...&countries=...&period=...
    const extra = new URLSearchParams(searchParams.toString());
    ['field', 'countries', 'period'].forEach((k) => extra.delete(k));
    const extraStr = extra.toString();
    const sep = base ? (extraStr ? '&' : '') : extraStr ? '?' : '';
    router.push(`${pathname}${base}${sep}${extraStr}`, { scroll: false });
  };

  const toggleCountry = (c: CountryCode) => {
    const has = filter.countries.includes(c);
    let next = has ? filter.countries.filter((x) => x !== c) : [...filter.countries, c];
    if (next.length === 0) next = [c]; // 최소 1개 유지
    push({ countries: COUNTRY_ORDER.filter((x) => next.includes(x)) });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(filterToQuery(filter).replace(/^\?/, ''));
    if (q.trim()) params.set('q', q.trim());
    router.push(`/patents${params.toString() ? `?${params.toString()}` : ''}`);
  };

  if (isFixedBasis) {
    return (
      <div className={styles.bar}>
        <div className={styles.group}>
          <span className={styles.groupLabel}>기준</span>
          <span style={{ fontSize: 12, color: 'var(--muted, #8a93a5)' }}>
            이 화면은 전체 기간 · 전체 공개 관할 고정 기준 실측 집계입니다. 분야·관할·기간 필터는
            특허 검색과 Graph View에만 적용됩니다.
          </span>
        </div>
        <form className={styles.search} onSubmit={submitSearch}>
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="특허 검색"
            aria-label="특허 검색"
          />
        </form>
      </div>
    );
  }

  return (
    <div className={styles.bar}>
      <div className={styles.group}>
        <span className={styles.groupLabel}>분야</span>
        <div className={styles.chips}>
          <button
            className={`${styles.chip} ${filter.field === 'all' ? styles.chipOn : ''}`}
            onClick={() => push({ field: 'all' })}
          >
            전체
          </button>
          {FIELDS.map((f) => (
            <button
              key={f.id}
              className={`${styles.chip} ${filter.field === f.id ? styles.chipOn : ''}`}
              onClick={() => push({ field: f.id as FieldId })}
              style={filter.field === f.id ? { borderColor: f.color, color: f.color } : undefined}
            >
              <i style={{ background: f.color }} />
              {f.label_ko}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>국가</span>
        <div className={styles.chips}>
          {COUNTRY_ORDER.map((c) => (
            <button
              key={c}
              className={`${styles.chip} ${styles.country} ${filter.countries.includes(c) ? styles.chipOn : ''}`}
              onClick={() => toggleCountry(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>기간</span>
        <div className={styles.chips}>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              className={`${styles.chip} ${filter.period === p.id ? styles.chipOn : ''}`}
              onClick={() => push({ period: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <form className={styles.search} onSubmit={submitSearch}>
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="특허 검색"
          aria-label="특허 검색"
        />
      </form>
    </div>
  );
}
