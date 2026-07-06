import { Suspense } from 'react';
import styles from './patents.module.css';
import PatentSearch from './PatentSearch';
import { parseFilter } from '../../lib/data';

export const metadata = { title: '특허 검색 · AEROPATENT' };

export default async function PatentsPage() {
  const q = '';

  return (
    <div>
      <div className={styles.head}>
        <span className="page-eyebrow">Patents</span>
        <h1 className="page-title">특허 검색</h1>
        <p className="page-sub">
          항공우주 분야 특허 데이터베이스에서 기술·출원인·키워드로 검색하세요.
          상단 필터바의 분야·국가·기간 조건이 함께 적용됩니다.
        </p>
      </div>
      <Suspense fallback={null}>
        <PatentSearch initialQ={q} />
      </Suspense>
    </div>
  );
}
