import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// PRD §12.1 — recommendations.search BFF 진입점
// 클라이언트 → 이 라우트 → Supabase Edge Function (time-slider-recommender)

const EDGE_FN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/time-slider-recommender`;

export async function POST(req: NextRequest) {
  // 1. 인증 (Auth.js v5)
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Edge Function 으로 프록시 (Supabase access token 전달)
  const body = await req.text();
  const accessToken =
    (session as { supabaseAccessToken?: string }).supabaseAccessToken ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body,
  });

  // 3. 응답 그대로 전달 (status code 포함)
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
