'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useModalFocus } from '../../lib/useModalFocus';
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
  const asideRef = useRef<HTMLElement>(null);
  const closeMenu = useCallback(() => setOpen(false), []);
  useModalFocus(open, asideRef, closeMenu);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const onChange = () => { if (desktop.matches) closeMenu(); };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, [closeMenu]);

  const filter = parseFilter(Object.fromEntries(searchParams.entries()));
  const fieldLabel =
    filter.field === 'all' ? '전체 분야' : FIELDS.find((f) => f.id === filter.field)?.label_ko ?? '전체 분야';
  const countriesLabel =
    filter.countries.length === COUNTRY_ORDER.length ? '전체 공개 관할' : filter.countries.join(', ');

  const query = searchParams.toString();
  const withQuery = (href: string) => (query ? `${href}?${query}` : href);

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls="app-navigation"
      >
        <span /> <span /> <span />
      </button>

      <aside id="app-navigation" ref={asideRef} data-modal-background className={`${styles.sidebar} ${open ? styles.open : ''}`} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label="주 메뉴" tabIndex={-1}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)} aria-label="AEROPATENT 홈">
          <Image
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/aero-logo.png`}
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
                aria-current={active ? "page" : undefined}
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
            <span className={styles.metaKey}>고유 패밀리(최근 10년)</span>
            <span className={`${styles.metaVal} mono`}>
              {LANDSCAPE_SUMMARY.family_count.toLocaleString()}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaKey} style={{ fontSize: 10.5 }}>
              CPC 후보군 기준 (텍스트 검증 전)
            </span>
          </div>
          <div className={styles.filterBox}>
            <div className={styles.filterTitle}>선택된 필터 (검색·그래프에만 적용)</div>
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
