'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './ReportDrawer.module.css';
import ReportBody from '../ReportBody';
import { useDrawer } from '../../lib/store';
import { parseFilter, filterToQuery } from '../../lib/data';
import { getNodeReport } from '../../lib/graph';

export default function ReportDrawer() {
  const { nodeId, close } = useDrawer();
  const searchParams = useSearchParams();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!nodeId) return null;

  const filter = parseFilter(Object.fromEntries(searchParams.entries()));
  const report = getNodeReport(nodeId, filter);
  const query = filterToQuery(filter).replace(/^\?/, '');

  return (
    <>
      <div className={styles.scrim} onClick={close} aria-hidden />
      <aside className={styles.drawer} role="dialog" aria-label="노드 보고서">
        <button className={styles.close} onClick={close} aria-label="닫기">
          ✕
        </button>
        <div className={styles.inner}>
          {report ? (
            <ReportBody report={report} query={query} />
          ) : (
            <p className={styles.empty}>이 노드에 대한 보고서를 찾을 수 없습니다.</p>
          )}
        </div>
      </aside>
    </>
  );
}
