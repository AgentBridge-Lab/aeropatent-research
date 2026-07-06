import styles from './viz.module.css';
import type { KeywordCount } from '../../lib/data';

export function Insights({ items }: { items: string[] }) {
  return (
    <ol className={styles.insights}>
      {items.map((t, i) => (
        <li key={i} className={styles.insight}>
          <span className={styles.insightNum}>{i + 1}</span>
          <span className={styles.insightText}>{t}</span>
        </li>
      ))}
    </ol>
  );
}

export function KeywordChips({ items }: { items: KeywordCount[] }) {
  return (
    <div className={styles.chips}>
      {items.map((k) => (
        <span key={k.keyword} className={styles.chip}>
          {k.keyword}
          <span className={styles.chipCount}>{k.count}</span>
        </span>
      ))}
    </div>
  );
}
