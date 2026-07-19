import type { Metadata, Viewport } from 'next';
import { Newsreader } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Providers } from './providers';
import { SiteHeader } from '@/components/site-header';
import { COPY } from '@/lib/copy';
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
    default: COPY.meta.titleDefault,
    template: COPY.meta.titleTemplate,
  },
  description: COPY.meta.description,
  applicationName: COPY.meta.appName,
  authors: [{ name: COPY.meta.author }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: COPY.meta.siteName,
  },
  robots: { index: true, follow: true },
  // 파비콘 — 브라우저 색상 테마별(라이트=ivory / 다크=dark). PNG 우선 + SVG 보강.
  icons: {
    icon: [
      {
        url: '/brand/daengroad-favicon-ivory-512.png',
        type: 'image/png',
        sizes: '512x512',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/brand/daengroad-favicon-dark-512.png',
        type: 'image/png',
        sizes: '512x512',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/brand/daengroad-favicon-ivory.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/brand/daengroad-favicon-dark.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: [
      { url: '/brand/daengroad-favicon-ivory-512.png', media: '(prefers-color-scheme: light)' },
      { url: '/brand/daengroad-favicon-dark-512.png', media: '(prefers-color-scheme: dark)' },
    ],
  },
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
