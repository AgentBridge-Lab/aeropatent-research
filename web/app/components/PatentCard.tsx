import Link from 'next/link';
import styles from './PatentCard.module.css';
import { FIELDS, COUNTRIES } from '../lib/data';
import type { Patent } from '../lib/data';

export default function PatentCard({
  patent,
  query = '',
}: {
  patent: Patent;
  query?: string;
}) {
  const field = FIELDS.find((f) => f.id === patent.field);
  const country = COUNTRIES.find((c) => c.code === patent.country);
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <span className={`${styles.pub} mono`}>{patent.publication_number}</span>
        <span className={styles.score} style={{ color: field?.color }}>
          ★ {patent.importance_score.toFixed(2)}
        </span>
      </div>
      <h3 className={styles.title}>{patent.title}</h3>
      <div className={styles.meta}>
        <span className={styles.metaCode}>{patent.country}</span>
        <span>{country?.label_ko}</span>
        <span className={styles.sep}>·</span>
        <span className="mono">{patent.filing_year}</span>
        <span className={styles.sep}>·</span>
        <span>{patent.applicantName}</span>
        <span className={styles.sep}>·</span>
        <span style={{ color: field?.color }}>{field?.label_ko}</span>
        <span className={`${styles.status} ${patent.status === '등록' ? styles.granted : styles.pending}`}>
          {patent.status}
        </span>
      </div>
      <p className={styles.abstract}>{patent.abstract_ko}</p>

      <details className={styles.claim}>
        <summary>대표 청구항 보기</summary>
        <div className={styles.claimBody}>
          {patent.claims.map((c) => (
            <p key={c.id}>
              <span className={styles.claimNo}>청구항 {c.claim_number}</span> {c.summary_ko}
            </p>
          ))}
        </div>
      </details>

      <div className={styles.actions}>
        <Link className={styles.action} href={`/graph?node=${encodeURIComponent(patent.id)}${query ? `&${query}` : ''}`}>
          그래프에서 보기
        </Link>
        <Link className={styles.action} href={`/patents/${encodeURIComponent(patent.publication_number)}`}>
          특허 상세
        </Link>
      </div>
    </article>
  );
}
