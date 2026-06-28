import type { Metadata, Viewport } from 'next';
import { Newsreader } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Providers } from './providers';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

// 세리프(누메랄·강조어) — DESIGN_SYSTEM §3. italic 강조어 + tnum 숫자.
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

// 무플래시 테마 부트 — 페인트 전에 data-theme 설정 (localStorage > 시스템 선호 > light)
const themeBoot = `(function(){try{var t=localStorage.getItem('daengroad-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

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

// 모바일 우선 (PRD §8) — 캔버스 색에 맞춰 라이트/다크 테마 컬러
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f0e9' },
    { media: '(prefers-color-scheme: dark)', color: '#14110d' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="light" className={newsreader.variable} suppressHydrationWarning>
      <head>
        {/* Pretendard 동적 서브셋 (UI 한국어) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
