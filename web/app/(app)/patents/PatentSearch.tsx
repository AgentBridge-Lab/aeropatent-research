'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import PatentCard from '../../components/PatentCard';
import styles from './patents.module.css';
import {
  parseFilter,
  filterToQuery,
  searchPatents,
  SUBFIELDS,
  APPLICANTS,
  FIELDS,
} from '../../lib/data';

const PAGE_SIZE = 40;
const LOAD_MORE = 20;

export default function PatentSearch({ initialQ }: { initialQ?: string }) {
  const sp = useSearchParams();
  const filter = parseFilter(Object.fromEntries(sp.entries()));

  const [q, setQ] = useState(initialQ ?? sp.get('q') ?? '');
  const [sort, setSort] = useState<'recent' | 'importance' | 'citations'>('recent');
  const [status, setStatus] = useState<'all' | '등록' | '공개'>('all');
  const [subfield, setSubfield] = useState('');
  const [applicant, setApplicant] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Subfields filtered to the current global field if not 'all'
  const subfieldOptions = useMemo(() => {
    if (filter.field === 'all') return SUBFIELDS;
    return SUBFIELDS.filter((s) => s.field === filter.field);
  }, [filter.field]);

  const results = useMemo(
    () => searchPatents({ q, filter, subfield: subfield || undefined, applicant: applicant || undefined, status, sort }),
    [q, filter, subfield, applicant, status, sort]
  );

  const visible = results.slice(0, limit);
  const hasMore = results.length > limit;

  const queryStr = filterToQuery(filter).replace(/^\?/, '');

  const fieldLabel =
    filter.field === 'all' ? '' : FIELDS.find((f) => f.id === filter.field)?.label_ko ?? '';

  return (
    <div>
      {/* Controls */}
      <div className={styles.controls}>
        {/* Search input */}
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="제목·초록·출원번호·출원인·키워드 검색…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setLimit(PAGE_SIZE); }}
            aria-label="특허 검색"
          />
          {q && (
            <button className={styles.clearBtn} onClick={() => setQ('')} aria-label="검색어 지우기">
              ×
            </button>
          )}
        </div>

        {/* Sort & Status row */}
        <div className={styles.controlsRow}>
          {/* Sort */}
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>정렬</span>
            <div className={styles.chips}>
              {(['recent', 'importance', 'citations'] as const).map((s) => (
                <button
                  key={s}
                  className={`${styles.chip} ${sort === s ? styles.chipActive : ''}`}
                  onClick={() => setSort(s)}
                >
                  {s === 'recent' ? '최신순' : s === 'importance' ? '중요도순' : '인용순'}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>상태</span>
            <div className={styles.chips}>
              {(['all', '등록', '공개'] as const).map((s) => (
                <button
                  key={s}
                  className={`${styles.chip} ${status === s ? styles.chipActive : ''}`}
                  onClick={() => setStatus(s)}
                >
                  {s === 'all' ? '전체' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Subfield select */}
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel} htmlFor="sf-select">
              세부분야{fieldLabel ? ` (${fieldLabel})` : ''}
            </label>
            <select
              id="sf-select"
              className={styles.select}
              value={subfield}
              onChange={(e) => { setSubfield(e.target.value); setLimit(PAGE_SIZE); }}
            >
              <option value="">전체 세부분야</option>
              {subfieldOptions.map((sf) => (
                <option key={sf.id} value={sf.id}>
                  {sf.label_ko}
                </option>
              ))}
            </select>
          </div>

          {/* Applicant select */}
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel} htmlFor="app-select">출원인</label>
            <select
              id="app-select"
              className={styles.select}
              value={applicant}
              onChange={(e) => { setApplicant(e.target.value); setLimit(PAGE_SIZE); }}
            >
              <option value="">전체 출원인</option>
              {APPLICANTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className={styles.resultMeta}>
        <span className={styles.resultCount}>
          <strong>{results.length.toLocaleString()}</strong>건 검색됨
        </span>
        {(q || subfield || applicant || status !== 'all') && (
          <button
            className={styles.resetBtn}
            onClick={() => {
              setQ('');
              setSubfield('');
              setApplicant('');
              setStatus('all');
              setSort('recent');
              setLimit(PAGE_SIZE);
            }}
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Results list */}
      {visible.length === 0 ? (
        <div className={styles.empty}>
          <p>검색 결과가 없습니다.</p>
          <p className={styles.emptyHint}>검색어나 필터 조건을 변경해 보세요.</p>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {visible.map((patent) => (
              <PatentCard key={patent.id} patent={patent} query={queryStr} />
            ))}
          </div>
          {hasMore && (
            <div className={styles.loadMore}>
              <button
                className={styles.loadMoreBtn}
                onClick={() => setLimit((l) => l + LOAD_MORE)}
              >
                더 보기 ({results.length - limit}건 더)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
