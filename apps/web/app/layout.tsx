import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Providers } from './providers';
import './globals.css';

// PRD §1.1 — 댕로드 메타
export const metadata: Metadata = {
  title: {
    default: '댕로드 — 퇴근 후 한적한 펫 외출',
    template: '%s · 댕로드',
  },
  description: '퇴근 18:12, 시간 슬라이더 3시간 → 한적도 87점·펫동반 검증된 충남 근교 즉시 추천',
  applicationName: '댕로드',
  authors: [{ name: 'Hun' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '댕로드',
  },
  robots: { index: true, follow: true },
};

// 모바일 우선 (PRD §8)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#f56500',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
