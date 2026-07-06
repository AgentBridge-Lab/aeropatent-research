import styles from './viz.module.css';
import type { YearPoint } from '../../lib/data';

const W = 560;
const H = 200;
const PAD = { top: 16, right: 14, bottom: 26, left: 28 };

export default function TrendArea({
  data,
  color = 'var(--cyan)',
}: {
  data: YearPoint[];
  color?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (innerW * i) / Math.max(1, data.length - 1);
  const y = (v: number) => PAD.top + innerH - (innerH * v) / max;

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.count), ...d }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${H - PAD.bottom} L ${pts[0].x.toFixed(1)} ${H - PAD.bottom} Z`;
  const gid = `ta-${Math.round(pts[0].x)}-${data.length}`;

  return (
    <svg className={styles.trend} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="연도별 추세">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => {
        const gy = PAD.top + innerH * t;
        return (
          <g key={i}>
            <line x1={PAD.left} y1={gy} x2={W - PAD.right} y2={gy} stroke="rgba(255,255,255,0.07)" />
            <text x={PAD.left - 6} y={gy + 3} textAnchor="end" className={styles.trendAxis}>
              {Math.round(max - max * t)}
            </text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="var(--bg)" stroke={color} strokeWidth="1.8" />
          <text x={p.x} y={H - PAD.bottom + 16} textAnchor="middle" className={styles.trendAxis}>
            {`'${String(p.year).slice(2)}`}
          </text>
        </g>
      ))}
    </svg>
  );
}
