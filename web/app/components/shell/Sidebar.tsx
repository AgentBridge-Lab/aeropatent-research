'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './Sidebar.module.css';
import { LANDSCAPE_SUMMARY, FIELDS, COUNTRY_ORDER, parseFilter } from '../../lib/data';

const MENU = [
  { href: '/analysis', label: '분석' },
  { href: '/countries', label: '국가 비교' },
  { href: '/graph', label: 'Graph View' },
  { href: '/patents', label: '특허 검색' },
  { href: '/reports', label: '보고서' },
];

const PERIOD_LABEL: Record<string, string> = {
  '5y': '최근 5년',
  '10y': '최근 10년',
  all: '전체 기간',
};

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const filter = parseFilter(Object.fromEntries(searchParams.entries()));
  const fieldLabel =
    filter.field === 'all' ? '전체 분야' : FIELDS.find((f) => f.id === filter.field)?.label_ko ?? '전체 분야';
  const countriesLabel =
    filter.countries.length === COUNTRY_ORDER.length ? '전체 국가' : filter.countries.join(', ');

  const query = searchParams.toString();
  const withQuery = (href: string) => (query ? `${href}?${query}` : href);

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setOpen((o) => !o)}
        aria-label="메뉴 열기"
      >
        <span /> <span /> <span />
      </button>

      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)} aria-label="AEROPATENT 홈">
          <Image
            src="/aero-logo.png"
            alt="AEROPATENT"
            width={184}
            height={46}
            priority
            className={styles.logoImg}
          />
        </Link>

        <nav className={styles.nav}>
          {MENU.map((m) => {
            const active = pathname === m.href || pathname.startsWith(m.href + '/');
            return (
              <Link
                key={m.href}
                href={withQuery(m.href)}
                className={`${styles.link} ${active ? styles.active : ''}`}
                onClick={() => setOpen(false)}
              >
                {m.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>데이터 기준일</span>
            <span className={`${styles.metaVal} mono`}>
              {LANDSCAPE_SUMMARY.generated_at.slice(0, 10)}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaKey}>특허 패밀리 수</span>
            <span className={`${styles.metaVal} mono`}>
              {LANDSCAPE_SUMMARY.family_count.toLocaleString()}
            </span>
          </div>
          <div className={styles.filterBox}>
            <div className={styles.filterTitle}>선택된 필터</div>
            <div className={styles.filterLine}>{fieldLabel}</div>
            <div className={styles.filterLine}>{countriesLabel}</div>
            <div className={styles.filterLine}>{PERIOD_LABEL[filter.period]}</div>
          </div>
        </div>

        <Link href="/" className={styles.home} onClick={() => setOpen(false)}>
          ← 홈으로
        </Link>
      </aside>

      {open && <div className={styles.scrim} onClick={() => setOpen(false)} aria-hidden />}
    </>
  );
}
