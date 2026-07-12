import Link from 'next/link';
import styles from './detail.module.css';
import {
  getPatent,
  similarPatents,
  getField,
  getSubfield,
  filterToQuery,
  parseFilter,
  COUNTRIES,
  PATENTS,
} from '../../../lib/data';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ patentId: string }>;
};

export function generateStaticParams() {
  return PATENTS.map((patent) => ({
    patentId: encodeURIComponent(patent.publication_number),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { patentId } = await params;
  const patent = getPatent(decodeURIComponent(patentId));
  if (!patent) return { title: '특허 없음 · AEROPATENT' };
  return { title: `${patent.publication_number} · AEROPATENT` };
}

export default async function PatentDetailPage({ params }: Props) {
  const { patentId } = await params;
  const patent = getPatent(decodeURIComponent(patentId));

  if (!patent) {
    return (
      <div className={styles.notFound}>
        <div className={styles.notFoundIcon}>⚠</div>
        <h2 className={styles.notFoundTitle}>특허를 찾을 수 없습니다</h2>
        <p className={styles.notFoundDesc}>
          요청하신 특허 번호 <span className="mono">{decodeURIComponent(patentId)}</span>를 찾을 수 없습니다.
        </p>
        <Link href="/patents" className={styles.backLink}>← 특허 검색으로 돌아가기</Link>
      </div>
    );
  }

  const field = getField(patent.field);
  const subfield = getSubfield(patent.subfield);
  const country = COUNTRIES.find((c) => c.code === patent.country);
  const similar = similarPatents(patent, 5);

  const filter = parseFilter();
  const relatedQuery = filterToQuery({ ...filter, field: patent.field });

  const claimTypeLabel = (type: 'independent' | 'dependent') =>
    type === 'independent' ? '독립항' : '종속항';

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/patents" className={styles.breadcrumbLink}>특허 검색</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span className="mono" style={{ color: 'var(--cyan)' }}>{patent.publication_number}</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={`${styles.pubNumber} mono`}>{patent.publication_number}</span>
          <span
            className={`${styles.statusPill} ${patent.status === '등록' ? styles.statusGranted : styles.statusPending}`}
          >
            {patent.status}
          </span>
        </div>
        <h1 className={styles.title}>{patent.title}</h1>
      </div>

      <div className={styles.layout}>
        {/* Main content */}
        <div className={styles.main}>

          {/* Facts grid */}
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>특허 정보</h2>
            <dl className={styles.factsGrid}>
              <div className={styles.factItem}>
                <dt className={styles.factLabel}>국가</dt>
                <dd className={styles.factValue}>
                  <span className={styles.countryCode}>{patent.country}</span>
                  <span>{country?.label_ko}</span>
                </dd>
              </div>
              <div className={styles.factItem}>
                <dt className={styles.factLabel}>출원인</dt>
                <dd className={styles.factValue}>{patent.applicantName}</dd>
              </div>
              <div className={styles.factItem}>
                <dt className={styles.factLabel}>출원연도</dt>
                <dd className={`${styles.factValue} mono`}>{patent.filing_year}</dd>
              </div>
              <div className={styles.factItem}>
                <dt className={styles.factLabel}>분야</dt>
                <dd className={styles.factValue}>
                  {field && (
                    <span style={{ color: field.color }}>{field.label_ko}</span>
                  )}
                  {subfield && (
                    <>
                      <span className={styles.factSep}>›</span>
                      <span className={styles.factMuted}>{subfield.label_ko}</span>
                    </>
                  )}
                </dd>
              </div>
              <div className={styles.factItem}>
                <dt className={styles.factLabel}>IPC / CPC</dt>
                <dd className={styles.factValue}>
                  <div className={styles.ipcList}>
                    {patent.ipc_cpc.map((code) => (
                      <span key={code} className={`${styles.ipcChip} mono`}>{code}</span>
                    ))}
                  </div>
                </dd>
              </div>
              <div className={styles.factItem}>
                <dt className={styles.factLabel}>중요도 / 인용</dt>
                <dd className={styles.factValue}>
                  <span className={styles.importanceScore} style={{ color: field?.color }}>
                    ★ {patent.importance_score.toFixed(2)}
                  </span>
                  <span className={styles.factSep}>·</span>
                  <span className={styles.factMuted}>인용 {patent.citations}건</span>
                </dd>
              </div>
            </dl>
          </section>

          {/* Abstract */}
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>요약</h2>
            <p className={styles.abstract}>{patent.abstract_ko}</p>
          </section>

          {/* Claims */}
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>대표 청구항</h2>
            <div className={styles.claims}>
              {patent.claims.map((claim) => (
                <div key={claim.id} className={styles.claimItem}>
                  <div className={styles.claimHead}>
                    <span className={`${styles.claimNumber} mono`}>청구항 {claim.claim_number}</span>
                    <span
                      className={`${styles.claimTypePill} ${
                        claim.claim_type === 'independent'
                          ? styles.claimIndep
                          : styles.claimDep
                      }`}
                    >
                      {claimTypeLabel(claim.claim_type)}
                    </span>
                  </div>
                  <p className={styles.claimSummary}>{claim.summary_ko}</p>
                  {claim.key_elements.length > 0 && (
                    <div className={styles.keyElements}>
                      {claim.key_elements.map((el) => (
                        <span key={el} className={styles.keyChip}>{el}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Keywords */}
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>관련 노드 (키워드)</h2>
            <div className={styles.keywordChips}>
              {patent.keywords.map((kw) => (
                <span key={kw} className={styles.kwChip}>{kw}</span>
              ))}
            </div>
          </section>

          {/* Actions */}
          <div className={styles.actions}>
            {patent.source_url && (
              <a
                href={patent.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionBtn}
              >
                원문 보기
              </a>
            )}
            <Link
              href={`/patents${relatedQuery}`}
              className={styles.actionBtn}
            >
              관련 특허 검색
            </Link>
            <Link
              href={`/graph?node=${encodeURIComponent(patent.id)}`}
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            >
              그래프에서 보기
            </Link>
          </div>
        </div>

        {/* Sidebar: similar patents */}
        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>유사 특허</h2>
            {similar.length === 0 ? (
              <p className={styles.noSimilar}>유사 특허가 없습니다.</p>
            ) : (
              <div className={styles.similarList}>
                {similar.map((p) => {
                  const pField = getField(p.field);
                  const pCountry = COUNTRIES.find((c) => c.code === p.country);
                  return (
                    <Link
                      key={p.id}
                      href={`/patents/${encodeURIComponent(p.publication_number)}`}
                      className={styles.similarCard}
                    >
                      <div className={styles.similarHead}>
                        <span className={`${styles.similarPub} mono`}>{p.publication_number}</span>
                        <span className={styles.similarScore} style={{ color: pField?.color }}>
                          ★ {p.importance_score.toFixed(2)}
                        </span>
                      </div>
                      <p className={styles.similarTitle}>{p.title}</p>
                      <div className={styles.similarMeta}>
                        <span>{pCountry?.label_ko}</span>
                        <span className={styles.similarSep}>·</span>
                        <span className="mono">{p.filing_year}</span>
                        <span className={styles.similarSep}>·</span>
                        <span>{p.applicantName}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
