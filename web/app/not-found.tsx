import Link from 'next/link';

export const metadata = { title: '페이지 없음 · AEROPATENT' };

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '0.85rem', letterSpacing: '0.2em', opacity: 0.6 }}>404</span>
      <h1 style={{ fontSize: '1.4rem', margin: 0 }}>페이지를 찾을 수 없습니다</h1>
      <p style={{ opacity: 0.7, margin: 0 }}>
        주소가 바뀌었거나 데이터 갱신으로 제거된 페이지일 수 있습니다.
      </p>
      <Link href="/" style={{ marginTop: '0.5rem', textDecoration: 'underline' }}>
        ← 홈으로 돌아가기
      </Link>
    </div>
  );
}
