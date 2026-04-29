'use server';

// PRD §12.1 reviews.create — 후기 작성 (PRD §16.3 필터/모더레이션)

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/sanitize';

const ReviewInputSchema = z.object({
  poiId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(8).default([]),
});

export type ReviewInput = z.infer<typeof ReviewInputSchema>;

// 간단 욕설/광고 필터 (실제는 KoBERT/CLOVA 사용 가능)
const BLOCKED = ['시발', '병신', '광고', '돈벌이'];

export async function createReview(input: ReviewInput) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: 'Unauthorized' };

  try {
    await enforceRateLimit({ userId: session.user.id, action: 'review', daily: true });
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false as const, error: e.message };
    throw e;
  }

  const parsed = ReviewInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  if (parsed.data.body && BLOCKED.some((w) => parsed.data.body!.includes(w))) {
    return { ok: false as const, error: '부적절한 내용이 포함되어 있어요' };
  }

  // PRD §14.1 OWASP XSS — 사용자 입력 sanitize
  const sanitizedBody = parsed.data.body ? sanitizeText(parsed.data.body) : null;

  const review = await prisma.review.create({
    data: {
      poiId: parsed.data.poiId,
      rating: parsed.data.rating,
      body: sanitizedBody,
      photos: parsed.data.photos,
      userId: session.user.id,
      status: 'PUBLIC',
    },
  });

  revalidatePath(`/poi/${parsed.data.poiId}`);
  return { ok: true as const, review };
}

export async function reportReview(reviewId: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: 'Unauthorized' };

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { reportCount: { increment: 1 } },
  });

  // 신고 5회 누적 시 자동 숨김 (PRD §16.3)
  if (review.reportCount >= 5) {
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'HIDDEN_REPORTED' },
    });
  }

  revalidatePath(`/poi/${review.poiId}`);
  return { ok: true as const };
}
