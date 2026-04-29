'use server';

// PRD §6.3, §12.1 verifications.checkIn — 사용자 방문 체크 + EXIF 사진 검증
// 자동 검증 배지 grant 는 Postgres 트리거(migration 0003)가 처리

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

  const parsed = CheckInSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  // EXIF 좌표가 POI 근처(반경 1km 이내)인지 검증 (간이)
  let isValid = true;
  if (parsed.data.exif?.lat && parsed.data.exif?.lng) {
    const poi = await prisma.poi.findUnique({
      where: { id: parsed.data.poiId },
      select: { lat: true, lng: true },
    });
    if (poi) {
      const distKm = haversine(poi.lat, poi.lng, parsed.data.exif.lat, parsed.data.exif.lng);
      isValid = distKm <= 1.0;
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
