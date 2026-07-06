import Link from 'next/link';
import styles from './reports.module.css';
import { parseFilter, filterToQuery, FIELDS } from '../../lib/data';
import { getNodeReport } from '../../lib/graph';

export const metadata = { title: '분석 보고서 · AEROPATENT' };

// Fixed notable subfield node IDs ordered by strategic significance
const SUBFIELD_REPORT_IDS = [
  'subfield.thermal-control',
  'subfield.reusable-launch-vehicle',
  'subfield.laser-comm',
  'subfield.autonomous-nav',
  'subfield.sar-radar',
  'subfield.phased-array',
];

export default async function ReportsPage() {
  const filter = parseFilter();
  const query = filterToQuery(filter).replace(/^\?/, '');

  // Build field reports (6 fields)
  const fieldReportIds = FIELDS.map((f) => `field.${f.id}`);

  // Fetch all reports in parallel
  const [fieldReports, subfieldReports] = await Promise.all([
    Promise.all(
      fieldReportIds.map(async (nodeId) => {
        const report = getNodeReport(nodeId, filter);
        const fieldId = nodeId.slice('field.'.length);
        const field = FIELDS.find((f) => f.id === fieldId);
        return { nodeId, report, color: field?.color ?? 'var(--cyan)' };
      })
    ),
    Promise.all(
      SUBFIELD_REPORT_IDS.map(async (nodeId) => {
        const report = getNodeReport(nodeId, filter);
        return { nodeId, report, color: 'var(--border-strong)' };
      })
    ),
  ]);

  return (
    <div>
      <div className={styles.head}>
        <span className="page-eyebrow">Reports</span>
        <h1 className="page-title">분석 보고서</h1>
        <p className={styles.summary}>
          분야별·세부기술별 특허 분석 보고서입니다. 필터 조건을 변경하면 보고서 지표가 함께
          갱신됩니다. 관심 보고서를 선택해 전략적 시사점과 주요 특허를 확인하세요.
        </p>
      </div>

      <h2 className={styles.sectionLabel}>분야별 보고서</h2>
      <div className={styles.grid}>
        {fieldReports.map(({ nodeId, report, color }) => {
          if (!report) return null;
          const href = `/reports/${encodeURIComponent(nodeId)}${query ? `?${query}` : ''}`;
          return (
            <Link
              key={nodeId}
              href={href}
              className={styles.card}
              style={{ borderLeftColor: color }}
            >
              <div className={styles.cardType}>분야 보고서</div>
              <div className={styles.cardTitle}>{report.title}</div>
              <div className={styles.cardConclusion}>{report.one_line_conclusion}</div>
              <div className={styles.kpiStrip}>
                {report.kpis.map((kpi) => (
                  <div key={kpi.label} className={styles.kpiItem}>
                    <span className={styles.kpiLabel}>{kpi.label}</span>
                    <span className={styles.kpiValue}>{kpi.value}</span>
                  </div>
                ))}
              </div>
              <span className={styles.cardArrow}>보고서 보기 →</span>
            </Link>
          );
        })}
      </div>

      <h2 className={styles.sectionLabel}>세부기술 보고서</h2>
      <div className={styles.grid}>
        {subfieldReports.map(({ nodeId, report }) => {
          if (!report) return null;
          const href = `/reports/${encodeURIComponent(nodeId)}${query ? `?${query}` : ''}`;
          return (
            <Link
              key={nodeId}
              href={href}
              className={styles.card}
              style={{ borderLeftColor: 'var(--violet)' }}
            >
              <div className={styles.cardType}>세부기술 보고서</div>
              <div className={styles.cardTitle}>{report.title}</div>
              <div className={styles.cardConclusion}>{report.one_line_conclusion}</div>
              <div className={styles.kpiStrip}>
                {report.kpis.map((kpi) => (
                  <div key={kpi.label} className={styles.kpiItem}>
                    <span className={styles.kpiLabel}>{kpi.label}</span>
                    <span className={styles.kpiValue}>{kpi.value}</span>
                  </div>
                ))}
              </div>
              <span className={styles.cardArrow}>보고서 보기 →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
