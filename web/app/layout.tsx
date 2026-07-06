import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AEROPATENT · 항공우주 특허 인텔리전스',
  description:
    '글로벌 항공우주 산업의 특허 출원 동향, 기술 분류, 주요 출원인을 분석하고 시각화하는 특허 인텔리전스 플랫폼.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: 일부 브라우저 확장(예: Trancy 번역기)이 <html>/<body>에
    // 속성을 주입해 발생하는 하이드레이션 경고를 억제 (해당 요소 속성에 한정).
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Pretendard (CDN, 동적 서브셋) — React 19가 <head>로 hoist */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          // eslint-disable-next-line @next/next/no-page-custom-font
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
        {children}
      </body>
    </html>
  );
}
