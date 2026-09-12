import Link from 'next/link';
import styles from './reports.module.css';
import { FIELDS, SUBFIELDS, filterToQuery } from '../../lib/data';
import { getNodeReport, REPORT_FILTER } from '../../lib/graph';

export const metadata = { title: '분석 보고서 · AEROPATENT' };

export default function ReportsPage() {
  const query = filterToQuery(REPORT_FILTER).replace(/^\?/, '');
  const fieldReports = FIELDS.map((field) => ({
    field,
    report: getNodeReport(`field.${field.id}`, REPORT_FILTER),
  }));

  return (
    <div>
      <div className={styles.head}>
        <span className="page-eyebrow">Reports</span>
        <h1 className="page-title">분석 보고서</h1>
        <p className={styles.summary}>
          9개 분야 보고서는 최근 10년 우선권 기준 BigQuery 집계를 사용합니다. {SUBFIELDS.length}개 세부기술
          보고서는 여러 기술축에 중복 연결될 수 있는 검토 완료 대표 문헌과 상위 분야 참고값을 구분하며, 문헌이 없는 기술도
          검색 범위·기술축·검토 질문을 빠짐없이 제공합니다.
        </p>
      </div>

      <h2 className={styles.sectionLabel}>분야별 보고서 · 9개</h2>
      <div className={styles.grid}>
        {fieldReports.map(({ field, report }) => {
          if (!report) return null;
          const nodeId = `field.${field.id}`;
          const href = `/reports/${encodeURIComponent(nodeId)}${query ? `?${query}` : ''}`;
          return (
            <Link
              key={nodeId}
              href={href}
              className={styles.card}
              style={{ borderLeftColor: field.color }}
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

      <h2 className={styles.sectionLabel}>세부기술 보고서 · {SUBFIELDS.length}개</h2>
      <p className={styles.sectionIntro}>
        분야별로 모든 세부기술을 표시합니다. ‘문헌 보강 필요’는 보고서가 빈 상태라는 뜻이
        아니라, 현재 세부기술 단위 대표 문헌을 상위 분야 통계와 섞지 않았다는 뜻입니다.
      </p>

      <div className={styles.fieldGroups}>
        {FIELDS.map((field) => {
          const subfields = SUBFIELDS.filter((subfield) => subfield.field === field.id);
          return (
            <section key={field.id} className={styles.fieldGroup}>
              <div className={styles.fieldGroupHead}>
                <span className={styles.fieldDot} style={{ background: field.color }} />
                <h3>{field.label_ko}</h3>
                <span>{subfields.length}개 세부기술</span>
              </div>
              <div className={styles.grid}>
                {subfields.map((subfield) => {
                  const nodeId = `subfield.${subfield.id}`;
                  const report = getNodeReport(nodeId, REPORT_FILTER);
                  if (!report) return null;
                  const href = `/reports/${encodeURIComponent(nodeId)}${query ? `?${query}` : ''}`;
                  const sampleCount = report.sample_count ?? 0;
                  const hasSample = sampleCount > 0;
                  return (
                    <Link
                      key={nodeId}
                      href={href}
                      className={styles.card}
                      style={{ borderLeftColor: field.color }}
                    >
                      <div className={styles.cardTopline}>
                        <div className={styles.cardType}>세부기술 보고서</div>
                        <span className={hasSample ? styles.statusReady : styles.statusPending}>
                          {hasSample ? `대표 문헌 ${sampleCount}건` : '문헌 보강 필요'}
                        </span>
                      </div>
                      <div className={styles.cardTitle}>{report.title}</div>
                      {subfield.label_en !== subfield.label_ko && (
                        <div className={styles.cardEnglish}>{subfield.label_en}</div>
                      )}
                      <div className={styles.cardConclusion}>{report.one_line_conclusion}</div>
                      <div className={styles.scopePreview}>
                        {report.technology_focus?.[0] ?? report.analysis_scope?.[0]}
                      </div>
                      <span className={styles.cardArrow}>보고서 보기 →</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
