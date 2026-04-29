'use server';

// PRD §12.1 — recommendations.search Server Action
// 클라이언트 → 이 액션 → Supabase Edge Function (time-slider-recommender)

import { z } from 'zod';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

const InputSchema = z.object({
  petId: z.string().uuid().nullable(),
  timeHours: z.number().min(1).max(6),
  startAt: z.string().datetime(),
  departure: z.object({ lat: z.number(), lng: z.number() }),
});

export type SearchInput = z.infer<typeof InputSchema>;

export async function searchRecommendations(input: SearchInput) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  const accessToken =
    (session as { supabaseAccessToken?: string }).supabaseAccessToken ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/time-slider-recommender`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(parsed.data),
    },
  );

  if (!res.ok) return { ok: false as const, error: `Edge function ${res.status}` };

  const data = (await res.json()) as { recommendations: unknown[] };
  revalidatePath('/me');
  return { ok: true as const, data };
}
