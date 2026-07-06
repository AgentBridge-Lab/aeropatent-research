import Link from 'next/link';
import styles from './ReportBody.module.css';
import KpiRow from './viz/KpiRow';
import CountryBars from './viz/CountryBars';
import TrendArea from './viz/TrendArea';
import { Insights } from './viz/Insights';
import { FIELDS, COUNTRIES, getApplicant } from '../lib/data';
import type { NodeReport } from '../lib/graph';

export default function ReportBody({
  report,
  query = '',
}: {
  report: NodeReport;
  query?: string;
}) {
  const isPatent = report.node_type === 'patent' && report.patent;

  return (
    <div className={styles.body}>
      <div className={styles.typeTag}>{typeLabel(report.node_type)}</div>
      <h2 className={styles.title}>{report.title}</h2>
      <p className={styles.oneLine}>{report.one_line_conclusion}</p>

      {report.kpis.length > 0 && (
        <div className={styles.block}>
          <KpiRow kpis={report.kpis.map((k) => ({ label: k.label, value: k.value }))} />
        </div>
      )}

      {isPatent && report.patent && (
        <div className={styles.block}>
          <div className={styles.facts}>
            <Fact label="국가" value={`${report.patent.country} · ${COUNTRIES.find((c) => c.code === report.patent!.country)?.label_ko ?? ''}`} />
            <Fact label="출원인" value={report.patent.applicantName} />
            <Fact label="출원연도" value={String(report.patent.filing_year)} />
            <Fact label="분야" value={FIELDS.find((f) => f.id === report.patent!.field)?.label_ko ?? ''} />
            <Fact label="IPC/CPC" value={report.patent.ipc_cpc.join(', ')} />
            <Fact label="상태" value={report.patent.status} />
          </div>
        </div>
      )}

      {report.country_distribution.length > 0 && (
        <Section label="국가별 분포">
          <CountryBars data={report.country_distribution} />
        </Section>
      )}

      {report.yearly_trend.length > 0 && (
        <Section label="기간별 추세">
          <TrendArea data={report.yearly_trend} />
        </Section>
      )}

      {report.insights.length > 0 && (
        <Section label="핵심 인사이트">
          <Insights items={report.insights} />
        </Section>
      )}

      {report.top_patents.length > 0 && (
        <Section label="주요 특허">
          <ol className={styles.patentList}>
            {report.top_patents.map((p) => (
              <li key={p.id}>
                <Link href={`/patents/${encodeURIComponent(p.publication_number)}`} className={styles.patentItem}>
                  <span className={`${styles.patentPub} mono`}>{p.publication_number}</span>
                  <span className={styles.patentTitle}>{p.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {isPatent && report.similar && report.similar.length > 0 && (
        <Section label="유사 특허">
          <ol className={styles.patentList}>
            {report.similar.map((p) => (
              <li key={p.id}>
                <Link href={`/patents/${encodeURIComponent(p.publication_number)}`} className={styles.patentItem}>
                  <span className={`${styles.patentPub} mono`}>{p.publication_number}</span>
                  <span className={styles.patentTitle}>{p.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {report.evidence && report.evidence.length > 0 && (
        <details className={styles.evidence}>
          <summary>근거 보기</summary>
          <div className={styles.evidenceBody}>
            {report.evidence.map((e, i) => (
              <div key={i} className={styles.evidenceItem}>
                <div className={styles.evidenceLabel}>{e.label}</div>
                <p>{e.text}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className={styles.cta}>
        <Link className={styles.ctaBtn} href={`/patents${query ? `?${query}` : ''}`}>
          관련 특허 검색
        </Link>
        {isPatent && report.patent ? (
          <Link className={`${styles.ctaBtn} ${styles.ctaPrimary}`} href={`/patents/${encodeURIComponent(report.patent.publication_number)}`}>
            특허 상세 보기
          </Link>
        ) : (
          <Link className={`${styles.ctaBtn} ${styles.ctaPrimary}`} href={`/reports/${encodeURIComponent(report.node_id)}${query ? `?${query}` : ''}`}>
            상세 보고서
          </Link>
        )}
      </div>
    </div>
  );
}

function typeLabel(t: NodeReport['node_type']): string {
  return (
    { field: '분야', subfield: '세부분야', patent: '특허', country: '국가', applicant: '출원인', keyword: '키워드' } as const
  )[t];
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.block}>
      <div className={styles.blockLabel}>{label}</div>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>{value}</span>
    </div>
  );
}
