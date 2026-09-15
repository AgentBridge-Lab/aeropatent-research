'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useModalFocus } from '../../lib/useModalFocus';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import styles from './ReportDrawer.module.css';
import ReportBody from '../ReportBody';
import { useDrawer } from '../../lib/store';
import { parseFilter, filterToQuery } from '../../lib/data';
import { getNodeReport } from '../../lib/graph';

export default function ReportDrawer() {
  const { nodeId, close } = useDrawer();
  const searchParams = useSearchParams();

  const pathname = usePathname();
  const router = useRouter();
  const drawerRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  const handleClose = useCallback(() => {
    close();
    if (searchParams.has('node')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('node');
      router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false });
    }
  }, [close, pathname, router, searchParams]);
  useModalFocus(Boolean(nodeId), drawerRef, handleClose);
  useEffect(() => {
    if (previousPath.current !== pathname) close();
    previousPath.current = pathname;
  }, [pathname, close]);

  if (!nodeId) return null;

  const filter = parseFilter(Object.fromEntries(searchParams.entries()));
  const report = getNodeReport(nodeId, filter);
  const query = filterToQuery(filter).replace(/^\?/, '');

  return (
    <>
      <div className={styles.scrim} onClick={handleClose} aria-hidden />
      <aside ref={drawerRef} className={styles.drawer} role="dialog" aria-modal="true" aria-label="노드 보고서" tabIndex={-1}>
        <button className={styles.close} onClick={handleClose} aria-label="닫기">
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
