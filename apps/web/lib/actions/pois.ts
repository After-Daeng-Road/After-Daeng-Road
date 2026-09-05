'use server';

// PRD §12.1 pois.detail — POI 상세 + 시간대별 한적도

import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const DetailInputSchema = z.object({
  poiId: z.string().uuid(),
  hour: z.number().int().min(0).max(23).optional(),
});

export type DetailInput = z.infer<typeof DetailInputSchema>;

export async function getPoiDetail(input: DetailInput) {
  const parsed = DetailInputSchema.safeParse(input);
  if (!parsed.success) return null;

  const poiId = parsed.data.poiId;
  const today = new Date().getDay();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // 세 쿼리는 서로 의존하지 않는다. 순차로 돌리면 왕복이 3배가 된다.
  // (Vercel 함수 리전과 DB 리전이 다를 때 왕복 1회가 곧 지연이다)
  const [poi, hourly, verifiedCount] = await Promise.all([
    prisma.poi.findUnique({
      where: { id: poiId },
      include: {
        durunubi: true,
        badges: true,
        forecasts: {
          where: { forecastDate: { gte: new Date() } },
          orderBy: { forecastDate: 'asc' },
          take: 30,
        },
        reviews: {
          where: { status: 'PUBLIC' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { nickname: true } }, reply: true },
        },
      },
    }),
    // 시간대별 한적도 (현재 weekday 기준)
    prisma.quietnessScore.findMany({
      where: { poiId, weekday: today },
      orderBy: { hourSlot: 'asc' },
      select: { hourSlot: true, score: true, sampleSize: true },
    }),
    // 검증 수 (PRD §6.3: 6개월 + isValid + 사진)
    prisma.verification.count({
      where: {
        poiId,
        isValid: true,
        photoUrl: { not: null },
        visitedAt: { gte: sixMonthsAgo },
      },
    }),
  ]);
  if (!poi) return null;

  return { poi, hourly, verifiedCount };
}
