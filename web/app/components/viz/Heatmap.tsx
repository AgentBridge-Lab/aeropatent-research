import styles from './viz.module.css';
import { FIELDS, COUNTRY_ORDER } from '../../lib/data';
import type { HeatCell } from '../../lib/data';

// 행: 분야, 열: 국가. 색상: 분야 색 + intensity(행 기준 정규화).
export default function Heatmap({ cells }: { cells: HeatCell[] }) {
  const byKey = new Map(cells.map((c) => [`${c.field}.${c.country}`, c]));
  return (
    <div className={styles.heat}>
      <div className={styles.heatHeadRow}>
        <div className={styles.heatCorner} />
        {COUNTRY_ORDER.map((c) => (
          <div key={c} className={styles.heatColHead}>
            {c}
          </div>
        ))}
      </div>
      {FIELDS.map((f) => (
        <div key={f.id} className={styles.heatRow}>
          <div className={styles.heatRowHead} title={f.label_ko}>
            <span className={styles.heatDot} style={{ background: f.color }} />
            {f.label_ko}
          </div>
          {COUNTRY_ORDER.map((c) => {
            const cell = byKey.get(`${f.id}.${c}`);
            const intensity = cell?.intensity ?? 0;
            return (
              <div
                key={c}
                className={styles.heatCell}
                style={{
                  background: `color-mix(in srgb, ${f.color} ${Math.round(
                    12 + intensity * 78
                  )}%, transparent)`,
                  color: intensity > 0.55 ? '#04121e' : 'var(--muted)',
                }}
                title={`${f.label_ko} · ${c}: ${cell?.count ?? 0}건`}
              >
                {cell?.count ?? 0}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
