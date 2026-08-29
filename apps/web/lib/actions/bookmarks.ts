'use server';

// PRD §7.2 [마이펫타임] 저장한 장소 — 북마크 토글/조회/목록

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const PoiIdSchema = z.object({ poiId: z.string().uuid() });

export async function toggleBookmark(input: { poiId: string }) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: 'Unauthorized' };

  const parsed = PoiIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  const userId = session.user.id;
  const { poiId } = parsed.data;

  const existing = await prisma.bookmark.findUnique({
    where: { userId_poiId: { userId, poiId } },
    select: { id: true },
  });

  let bookmarked: boolean;
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    bookmarked = false;
  } else {
    await prisma.bookmark.create({ data: { userId, poiId } });
    bookmarked = true;
  }

  revalidatePath('/me/saved');
  revalidatePath(`/poi/${poiId}`);
  return { ok: true as const, bookmarked };
}

export async function isBookmarked(poiId: string) {
  const session = await auth();
  if (!session?.user?.id) return false;
  const parsed = z.string().uuid().safeParse(poiId);
  if (!parsed.success) return false;
  const row = await prisma.bookmark.findUnique({
    where: { userId_poiId: { userId: session.user.id, poiId: parsed.data } },
    select: { id: true },
  });
  return !!row;
}

export async function listBookmarks() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      poi: {
        select: {
          id: true,
          name: true,
          type: true,
          address: true,
          imageUrls: true,
          petAllowed: true,
          isWellness: true,
          isEco: true,
        },
      },
    },
  });
  // Poi 선택 필드에 Decimal 없음 → 그대로 직렬화 가능
  return rows.map((r) => ({ bookmarkId: r.id, createdAt: r.createdAt, poi: r.poi }));
}
