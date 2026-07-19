import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// PRD §14, §14.1 OWASP — Security Headers
// CSP는 'self' 우선 + 카카오/Supabase/Sentry/GA4 등 명시 화이트리스트
// HSTS 1년, X-Frame-Options DENY (clickjacking 차단), Permissions-Policy 최소화
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://dapi.kakao.com https://t1.daumcdn.net https://www.googletagmanager.com https://*.sentry.io https://challenges.cloudflare.com https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
  img-src 'self' blob: data: https://tong.visitkorea.or.kr http://tong.visitkorea.or.kr https://datalab.visitkorea.or.kr https://k.kakaocdn.net https://*.supabase.co https://www.google-analytics.com https://t1.daumcdn.net https://images.unsplash.com;
  font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://dapi.kakao.com https://apis-navi.kakaomobility.com https://*.sentry.io https://www.google-analytics.com https://api.resend.com https://va.vercel-scripts.com https://cdn.jsdelivr.net;
  frame-src 'self' https://challenges.cloudflare.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspHeader },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

// /api-docs (Swagger/Scalar) 전용 CSP.
// Scalar 표준 번들은 jsDelivr CDN에서 로드되므로 이 경로에 한해 cdn.jsdelivr.net 을 허용한다.
// connect-src 는 스펙 fetch('self')와 추천 Edge Function try-it(*.supabase.co)까지 포함.
// 그 외 모든 경로는 위의 엄격한 cspHeader 를 그대로 유지한다 (PRD §14).
const apiDocsCspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com;
  img-src 'self' blob: data: https:;
  font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com;
  connect-src 'self' https://cdn.jsdelivr.net https://*.supabase.co;
  worker-src 'self' blob:;
  frame-ancestors 'none';
  base-uri 'self';
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const apiDocsHeaders = [
  { key: 'Content-Security-Policy', value: apiDocsCspHeader },
  ...securityHeaders.filter((h) => h.key !== 'Content-Security-Policy'),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // PRD §14 fingerprinting 방지
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
      allowedOrigins: process.env.NEXT_PUBLIC_APP_URL
        ? [new URL(process.env.NEXT_PUBLIC_APP_URL).host]
        : undefined,
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'tong.visitkorea.or.kr' },
      { protocol: 'http', hostname: 'tong.visitkorea.or.kr' },
      { protocol: 'https', hostname: 'datalab.visitkorea.or.kr' },
      { protocol: 'https', hostname: 'k.kakaocdn.net' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  async headers() {
    return [
      // /api-docs (Swagger UI) — Scalar 번들(jsDelivr) 허용을 위한 완화된 CSP
      { source: '/api-docs/:path*', headers: apiDocsHeaders },
      // 그 외 전 경로 — 엄격 보안 헤더
      { source: '/((?!api-docs).*)', headers: securityHeaders },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
