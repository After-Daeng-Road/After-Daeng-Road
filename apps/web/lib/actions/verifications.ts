'use server';

// PRD §6.3, §12.1 verifications.checkIn — 사용자 방문 체크 + EXIF 사진 검증
// 자동 검증 배지 grant 는 Postgres 트리거(migration 0003)가 처리

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit';

const CheckInSchema = z.object({
  poiId: z.string().uuid(),
  evaluation: z.enum(['QUIET', 'OK', 'CROWDED']),
  photoUrl: z.string().url().nullable(),
  exif: z
    .object({
      lat: z.number().nullable(),
      lng: z.number().nullable(),
      takenAt: z.string().datetime().nullable(),
    })
    .nullable(),
});

export type CheckInInput = z.infer<typeof CheckInSchema>;

export async function checkIn(input: CheckInInput) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: 'Unauthorized' };

  // PRD §14, §20: Rate Limit + 어뷰징 검증 배지 조작 방어
  try {
    await enforceRateLimit({ userId: session.user.id, action: 'checkIn', daily: true });
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false as const, error: e.message };
    throw e;
  }

  const parsed = CheckInSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  // PRD §6.3, §20: EXIF 검증 강화 — 어뷰징 검증 배지 조작 방어
  // 1) GPS 좌표 → POI 1km 이내 검증
  // 2) 촬영 시각 → 최근 7일 이내 (오래된 사진 재사용 방지)
  // 3) GPS 없는 사진 → isValid=false (유저는 등록 가능하나 검증 카운트 X)
  // 4) 사진 미첨부 → isValid=false
  let isValid = false;
  const exif = parsed.data.exif;
  if (parsed.data.photoUrl && exif?.lat != null && exif?.lng != null) {
    const poi = await prisma.poi.findUnique({
      where: { id: parsed.data.poiId },
      select: { lat: true, lng: true },
    });
    if (poi) {
      const distKm = haversine(poi.lat, poi.lng, exif.lat, exif.lng);
      const distOk = distKm <= 1.0;
      const timeOk = exif.takenAt
        ? Date.now() - new Date(exif.takenAt).getTime() <= 7 * 24 * 3600 * 1000
        : false;
      isValid = distOk && timeOk;
    }
  }

  const verification = await prisma.verification.create({
    data: {
      poiId: parsed.data.poiId,
      userId: session.user.id,
      visitedAt: new Date(),
      photoUrl: parsed.data.photoUrl,
      evaluation: parsed.data.evaluation,
      exifLat: parsed.data.exif?.lat ?? null,
      exifLng: parsed.data.exif?.lng ?? null,
      exifAt: parsed.data.exif?.takenAt ? new Date(parsed.data.exif.takenAt) : null,
      isValid,
    },
  });

  revalidatePath(`/poi/${parsed.data.poiId}`);
  return { ok: true as const, verification };
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
