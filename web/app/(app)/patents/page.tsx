import { Suspense } from 'react';
import styles from './patents.module.css';
import PatentSearch from './PatentSearch';
import { LANDSCAPE_SUMMARY, PATENTS } from '../../lib/data';

export const metadata = { title: '특허 검색 · AEROPATENT' };

export default async function PatentsPage() {
  const q = '';

  return (
    <div>
      <div className={styles.head}>
        <span className="page-eyebrow">Patents</span>
        <h1 className="page-title">특허 검색</h1>
        <p className="page-sub">
          최근 10년 CPC 기준 분석 후보군은 {LANDSCAPE_SUMMARY.family_count.toLocaleString()}개 패밀리,
          {' '}{LANDSCAPE_SUMMARY.publication_count.toLocaleString()}개 공개 문헌입니다. 아래 검색은 제목·초록과
          원문 링크를 검토한 대표 문헌 {PATENTS.length.toLocaleString()}건을 대상으로 하며, 기본 화면에서는
          기간 제한 없이 모두 표시합니다.
        </p>
      </div>
      <Suspense fallback={null}>
        <PatentSearch initialQ={q} />
      </Suspense>
    </div>
  );
}
