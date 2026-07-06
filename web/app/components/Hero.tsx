'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './Hero.module.css';

const ENTER_HREF = '/analysis';
const assetPath = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;

export default function Hero({ children }: { children: ReactNode }) {
  const router = useRouter();
  const down = useRef<{ x: number; y: number } | null>(null);

  const go = () => router.push(ENTER_HREF);

  const handlePointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY };
  };

  // 3D 씬을 드래그한 경우(이동 큼)는 입장으로 처리하지 않는다.
  const handleClick = (e: React.MouseEvent) => {
    if (down.current) {
      const dx = Math.abs(e.clientX - down.current.x);
      const dy = Math.abs(e.clientY - down.current.y);
      down.current = null;
      if (dx > 8 || dy > 8) return;
    }
    go();
  };

  return (
    <section
      className={styles.hero}
      id="top"
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <div className={styles.spline} aria-hidden>
        {children}
      </div>

      <div className={styles.scrim} aria-hidden />

      {/* 로고 */}
      <div className={styles.logo}>
        <img
          src={assetPath('/aero-logo.png')}
          alt="AEROPATENT"
          width={232}
          height={58}
          className={styles.logoImg}
        />
      </div>

      {/* 데이터 탐색 버튼 + 클릭 힌트(아이콘만) */}
      <div className={styles.dock}>
        <button
          type="button"
          className={styles.enter}
          onClick={(e) => {
            e.stopPropagation();
            go();
          }}
        >
          <span className={styles.enterLabel}>
            Explore Data
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        <span className={styles.hint} aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </section>
  );
}
