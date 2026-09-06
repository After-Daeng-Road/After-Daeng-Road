import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

// Next.js 표준 — /sitemap.xml 생성 (robots.ts 가 이미 이 경로를 가리키고 있었다)
// 공개 페이지 + 실데이터 POI 상세. 로그인 영역(/me, /recommendations)은 색인 대상이 아니다.

export const revalidate = 86400; // 하루 1회 갱신

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://daengroad.app';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/trails`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/login`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/legal/terms`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${baseUrl}/legal/privacy`, changeFrequency: 'monthly', priority: 0.2 },
  ];

  // POI 상세 — 검색 유입의 실질 랜딩. 빌드/DB 오류가 sitemap 전체를 죽이지 않게 방어.
  let poiRoutes: MetadataRoute.Sitemap = [];
  try {
    const pois = await prisma.poi.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    });
    poiRoutes = pois.map((p) => ({
      url: `${baseUrl}/poi/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    /* DB 불가 시 정적 경로만 제공 */
  }

  return [...staticRoutes, ...poiRoutes];
}
