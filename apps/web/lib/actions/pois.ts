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

  const poi = await prisma.poi.findUnique({
    where: { id: parsed.data.poiId },
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
  });
  if (!poi) return null;

  // 시간대별 한적도 (현재 weekday 기준 0~23시)
  const today = new Date().getDay();
  const hourly = await prisma.quietnessScore.findMany({
    where: { poiId: poi.id, weekday: today },
    orderBy: { hourSlot: 'asc' },
    select: { hourSlot: true, score: true, sampleSize: true },
  });

  // 검증 수 (PRD §6.3: 6개월 + isValid + 사진)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const verifiedCount = await prisma.verification.count({
    where: {
      poiId: poi.id,
      isValid: true,
      photoUrl: { not: null },
      visitedAt: { gte: sixMonthsAgo },
    },
  });

  return { poi, hourly, verifiedCount };
}
