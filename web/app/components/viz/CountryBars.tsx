import styles from './viz.module.css';
import type { CountryDist } from '../../lib/data';

export default function CountryBars({ data }: { data: CountryDist[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className={styles.bars}>
      {data.map((d) => (
        <div key={d.country} className={styles.barRow}>
          <span className={styles.barLabel}>
            <span className={styles.barCode}>{d.country}</span>
          </span>
          <span className={styles.barTrack}>
            <span
              className={styles.barFill}
              style={{ width: `${(d.count / max) * 100}%`, background: d.color }}
            />
          </span>
          <span className={styles.barVal}>
            {d.count} · {Math.round(d.share * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
