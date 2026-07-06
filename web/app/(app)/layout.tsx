import { Suspense } from 'react';
import styles from './app.module.css';
import Sidebar from '../components/shell/Sidebar';
import TopFilterBar from '../components/shell/TopFilterBar';
import ReportDrawer from '../components/shell/ReportDrawer';

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
        <div className={styles.content}>{children}</div>
      </div>
      <Suspense fallback={null}>
        <ReportDrawer />
      </Suspense>
    </div>
  );
}
