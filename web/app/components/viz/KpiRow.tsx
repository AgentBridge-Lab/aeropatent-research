import styles from './viz.module.css';

export interface Kpi {
  label: string;
  value: string;
  unit?: string;
  foot?: string;
  accent?: string;
}

export default function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className={styles.kpiRow}>
      {kpis.map((k) => (
        <div key={k.label} className={styles.kpi}>
          <span className={styles.kpiBar} style={{ background: k.accent ?? 'var(--cyan)' }} />
          <div className={styles.kpiLabel}>{k.label}</div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{k.value}</span>
            {k.unit && <span className={styles.kpiUnit}>{k.unit}</span>}
          </div>
          {k.foot && <div className={styles.kpiFoot}>{k.foot}</div>}
        </div>
      ))}
    </div>
  );
}
