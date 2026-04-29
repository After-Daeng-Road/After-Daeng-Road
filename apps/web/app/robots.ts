import type { MetadataRoute } from 'next';

// Next.js 표준 — 정적 robots.txt 생성

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://daengroad.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/me/', // 개인 영역 색인 차단
          '/unsubscribe', // 토큰 노출 방지
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
