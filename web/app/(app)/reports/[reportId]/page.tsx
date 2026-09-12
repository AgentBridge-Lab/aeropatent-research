import Link from 'next/link';
import styles from './report.module.css';
import KpiRow from '../../../components/viz/KpiRow';
import CountryBars from '../../../components/viz/CountryBars';
import TrendArea from '../../../components/viz/TrendArea';
import { Insights } from '../../../components/viz/Insights';
import PatentCard from '../../../components/PatentCard';
import {
  filterToQuery,
  FIELDS,
  SUBFIELDS,
  COUNTRIES,
  PATENTS,
  APPLICANTS,
  KEYWORDS,
} from '../../../lib/data';
import { getNodeReport, REPORT_FILTER } from '../../../lib/graph';

export function generateStaticParams() {
  return [
    ...FIELDS.map((field) => ({ reportId: `field.${field.id}` })),
    ...SUBFIELDS.map((subfield) => ({ reportId: `subfield.${subfield.id}` })),
    ...COUNTRIES.map((country) => ({ reportId: `country.${country.code}` })),
    ...PATENTS.map((patent) => ({ reportId: patent.id })),
    ...APPLICANTS.map((applicant) => ({ reportId: `applicant.${applicant.id}` })),
    ...KEYWORDS.map((keyword) => ({ reportId: `keyword.${keyword}` })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const nodeId = decodeURIComponent(reportId);
  const report = getNodeReport(nodeId, REPORT_FILTER);
  return { title: `${report?.title ?? nodeId} · AEROPATENT` };
}

const NODE_TYPE_LABEL: Record<string, string> = {
  field: '분야',
  subfield: '세부분야',
  patent: '특허',
  country: '공개 관할',
  applicant: '출원인',
  keyword: '키워드',
};

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionNum}>{num}</span>
      <span className={styles.sectionTitle}>{title}</span>
    </div>
  );
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const nodeId = decodeURIComponent(reportId);
  const filter = REPORT_FILTER;
  const query = filterToQuery(filter).replace(/^\?/, '');

  const report = getNodeReport(nodeId, filter);

  if (!report) {
    return (
      <div className={styles.notFound}>
        <div className={styles.notFoundTitle}>보고서를 찾을 수 없습니다</div>
        <Link href={`/reports${query ? `?${query}` : ''}`} className={styles.notFoundLink}>
          ← 보고서 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const isPatentNode = report.node_type === 'patent';
  const typeLabel = NODE_TYPE_LABEL[report.node_type] ?? report.node_type;
  const rawNodeId = nodeId.split('.').slice(1).join('.');
  const patentSearchParams = new URLSearchParams(query);
  if (report.node_type === 'field') patentSearchParams.set('field', rawNodeId);
  if (report.node_type === 'subfield') {
    const subfield = SUBFIELDS.find((item) => item.id === rawNodeId);
    if (subfield) patentSearchParams.set('field', subfield.field);
    patentSearchParams.set('subfield', rawNodeId);
  }
  if (report.node_type === 'country') patentSearchParams.set('countries', rawNodeId);
  if (report.node_type === 'applicant') patentSearchParams.set('applicant', rawNodeId);
  if (report.node_type === 'keyword') patentSearchParams.set('q', rawNodeId);
  if (report.node_type === 'patent' && report.patent) {
    patentSearchParams.set('q', report.patent.publication_number);
  }
  const patentSearchQuery = patentSearchParams.toString();

  const filterPills = [
    { label: '보고서 유형', value: typeLabel },
    { label: '분석 기준', value: report.basis_note ?? '대표 문헌 전체 표본' },
  ];

  return (
    <div>
      {/* Back link */}
      <Link href={`/reports${query ? `?${query}` : ''}`} className={styles.back}>
        ← 보고서 목록
      </Link>

      {/* Header */}
      <div className={styles.head}>
        <div className={styles.typeTag}>{typeLabel}</div>
        <h1 className={styles.title}>{report.title}</h1>
        <p className={styles.oneLine}>{report.one_line_conclusion}</p>
      </div>

      {/* Top CTA bar */}
      <div className={styles.ctaBar}>
        <Link
          href={`/patents${patentSearchQuery ? `?${patentSearchQuery}` : ''}`}
          className={styles.ctaBtn}
        >
          관련 특허 검색
        </Link>
        {!isPatentNode && (
          <Link
            href={`/graph?node=${encodeURIComponent(nodeId)}${patentSearchQuery ? `&${patentSearchQuery}` : ''}`}
            className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}
          >
            그래프에서 보기 →
          </Link>
        )}
      </div>

      {/* §1 Executive Summary */}
      <div className={styles.section}>
        <SectionHeader num={1} title="Executive Summary" />
        <p className={styles.summaryText}>
          {report.one_line_conclusion}
          {report.insights.length > 0 && (
            <>
              {' '}
              {report.insights.slice(0, 2).join(' ')}
            </>
          )}
        </p>
      </div>

      {/* §2 분석 조건 */}
      <div className={styles.section}>
        <SectionHeader num={2} title="분석 범위와 데이터 기준" />
        <div className={styles.filterPills}>
          {filterPills.map((p) => (
            <span key={p.label} className={styles.pill}>
              <span className={styles.pillLabel}>{p.label}</span>
              {p.value}
            </span>
          ))}
        </div>
        {report.analysis_scope && report.analysis_scope.length > 0 && (
          <ul className={styles.scopeList}>
            {report.analysis_scope.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
      </div>

      {/* §3 핵심 지표 */}
      {report.kpis.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={3} title="핵심 지표" />
          <KpiRow kpis={report.kpis.map((k) => ({ label: k.label, value: k.value }))} />
        </div>
      )}

      {/* §4 공개 관할별 비교 */}
      {report.country_distribution.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={4} title="공개 관할별 비교" />
          {report.country_distribution_basis && (
            <p className={styles.sectionMeta}>{report.country_distribution_basis}</p>
          )}
          <CountryBars data={report.country_distribution} />
        </div>
      )}

      {/* §5 기간별 추세 */}
      {report.yearly_trend.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={5} title="연도별 추세" />
          {report.yearly_trend_basis && (
            <p className={styles.sectionMeta}>{report.yearly_trend_basis}</p>
          )}
          <TrendArea data={report.yearly_trend} />
        </div>
      )}

      {/* §6 기술축과 검토 질문 */}
      {((report.technology_focus?.length ?? 0) > 0 || (report.decision_questions?.length ?? 0) > 0) && (
        <div className={styles.section}>
          <SectionHeader num={6} title="기술축과 검토 질문" />
          <div className={styles.twoColumn}>
            <div>
              <h3 className={styles.subheading}>분석할 기술축</h3>
              <ul className={styles.scopeList}>
                {report.technology_focus?.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h3 className={styles.subheading}>의사결정 질문</h3>
              <ul className={styles.scopeList}>
                {report.decision_questions?.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* §7 세부기술 클러스터 */}
      {report.subfield_overview && report.subfield_overview.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={7} title="세부기술 클러스터" />
          <p className={styles.sectionMeta}>
            모든 세부기술을 표시합니다. 대표 문헌 수가 0인 항목은 빈 클러스터가 아니라 검색 기준이 정의된 보강 대상으로 구분합니다.
          </p>
          <div className={styles.subfieldGrid}>
            {report.subfield_overview.map((subfield) => (
              <Link
                key={subfield.id}
                href={`/reports/${encodeURIComponent(`subfield.${subfield.id}`)}`}
                className={styles.subfieldCard}
              >
                <span className={styles.subfieldName}>{subfield.label}</span>
                {subfield.label_en !== subfield.label && (
                  <span className={styles.subfieldEnglish}>{subfield.label_en}</span>
                )}
                <span className={styles.subfieldDescription}>{subfield.description}</span>
                <span className={subfield.sample_count > 0 ? styles.coverageReady : styles.coveragePending}>
                  {subfield.sample_count > 0
                    ? `대표 문헌 ${subfield.sample_count}건`
                    : '검색 기준 수록 · 문헌 보강 필요'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* §8 주요 출원인 */}
      {report.top_applicants && report.top_applicants.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={8} title="주요 출원인" />
          <p className={styles.sectionMeta}>{report.top_applicants[0].basis}</p>
          <div className={styles.twoColumn}>
            <div>
              <h3 className={styles.subheading}>글로벌 상위 출원인</h3>
              <div className={styles.applicantList}>
                {report.top_applicants.map((applicant) => (
                  <div key={applicant.name} className={styles.applicantRow}>
                    <span className={styles.applicantName}>{applicant.name}</span>
                    <span className={styles.applicantCount}>{applicant.count.toLocaleString()}개</span>
                  </div>
                ))}
              </div>
            </div>
            {report.kr_top_applicants && report.kr_top_applicants.length > 0 && (
              <div>
                <h3 className={styles.subheading}>한국 상위 출원인</h3>
                <div className={styles.applicantList}>
                  {report.kr_top_applicants.map((applicant) => (
                    <div key={applicant.name} className={styles.applicantRow}>
                      <span className={styles.applicantName}>{applicant.name}</span>
                      <span className={styles.applicantCount}>{applicant.count.toLocaleString()}개</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* §9 CPC 기술축 */}
      {report.top_cpc_codes && report.top_cpc_codes.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={9} title="상위 CPC 기술축" />
          <p className={styles.sectionMeta}>CPC 매칭 건수는 분류코드 출현 수로 중복될 수 있으며 패밀리 수가 아닙니다.</p>
          <div className={styles.cpcGrid}>
            {report.top_cpc_codes.map((item) => (
              <div key={item.code} className={styles.cpcCard}>
                <span className={styles.cpcCode}>{item.code}</span>
                <span className={styles.cpcCount}>{item.count.toLocaleString()}회 매칭</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* §10 문헌 근거 검증 상태 */}
      {((report.reference_patents?.length ?? 0) > 0 || report.node_type === 'field' || report.node_type === 'subfield') && (
        <div className={styles.section}>
          <SectionHeader num={10} title="문헌 근거 검증 상태" />
          {report.reference_patents && report.reference_patents.length > 0 ? (
            <>
              <p className={styles.sectionMeta}>{report.reference_patents[0].basis}. 피인용 수는 기술 영향도 탐색용이며 권리 유효성 판단값이 아닙니다.</p>
              <ol className={styles.referenceList}>
                {report.reference_patents.map((patent) => (
                  <li key={patent.publication_number}>
                    <a href={patent.source_url} target="_blank" rel="noreferrer">
                      <span className={styles.referenceNumber}>{patent.publication_number}</span>
                      <span className={styles.referenceTitle}>{patent.title}</span>
                      <span className={styles.referenceMetric}>후속 인용 패밀리 {patent.citing_families.toLocaleString()}개</span>
                    </a>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <div className={styles.emptyState}>
              <strong>미검증 피인용 후보는 표시하지 않습니다.</strong>
              <span>CPC 후보군만으로 연결된 문헌은 제목·초록·청구항의 기술 적합성 검증이 끝날 때까지 보고서 근거에서 제외합니다.</span>
            </div>
          )}
        </div>
      )}

      {/* §11 대표 문헌 */}
      {(report.top_patents.length > 0 || report.node_type === 'field' || report.node_type === 'subfield') && (
        <div className={styles.section}>
          <SectionHeader num={11} title="대표 문헌과 원문" />
          {report.top_patents.length > 0 ? (
          <ol className={styles.patentList}>
            {report.top_patents.map((patent) => (
              <li key={patent.id}>
                <PatentCard patent={patent} query={query} />
              </li>
            ))}
          </ol>
          ) : (
            <div className={styles.emptyState}>
              <strong>현재 연결된 대표 문헌이 없습니다.</strong>
              <span>0건 그래프를 사실처럼 표시하지 않고, 검색 기준과 상위 분야 근거만 제공합니다. 문헌 단위 데이터가 보강되면 이 영역에 원문 링크가 추가됩니다.</span>
            </div>
          )}
        </div>
      )}

      {/* §12 전략적 시사점 */}
      {report.insights.length > 0 && (
        <div className={styles.section}>
          <SectionHeader num={12} title="전략적 시사점" />
          <Insights items={report.insights} />
        </div>
      )}

      {/* §13 근거와 한계 */}
      <div className={styles.section}>
        <SectionHeader num={13} title="근거와 해석 한계" />
        {report.limitations && report.limitations.length > 0 && (
          <ul className={styles.scopeList}>
            {report.limitations.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
        {report.evidence && report.evidence.length > 0 ? (
          <div className={styles.evidenceBody}>
            {report.evidence.map((e, i) => (
              <div key={i} className={styles.evidenceItem}>
                <div className={styles.evidenceItemLabel}>{e.label}</div>
                <p>{e.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.evidenceNote}>
            문헌이 표시된 보고서는 각 카드의 특허 상세와 Google Patents 원문 링크에서 근거를 확인할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
}
