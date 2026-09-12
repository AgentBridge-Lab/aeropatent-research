import { Suspense } from 'react';
import styles from './app.module.css';
import Sidebar from '../components/shell/Sidebar';
import TopFilterBar from '../components/shell/TopFilterBar';
import ReportDrawer from '../components/shell/ReportDrawer';
import { DATA_SOURCE_NOTE, CANDIDATE_SCOPE_NOTE } from '../lib/data';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <div className={styles.main}>
        <Suspense fallback={null}>
          <TopFilterBar />
        </Suspense>
        <div className={styles.content}>
          {children}
          <footer className={styles.dataNote}>
            출처: {DATA_SOURCE_NOTE} · 총량·분야 수치는 {CANDIDATE_SCOPE_NOTE} · 공개 관할 기준
            집계로 FTO·침해·무효 판단에 사용할 수 없습니다.
          </footer>
        </div>
      </div>
      <Suspense fallback={null}>
        <ReportDrawer />
      </Suspense>
    </div>
  );
}
