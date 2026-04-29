'use client';

import { createBrowserClient } from '@supabase/ssr';

// 브라우저 측 Supabase 클라이언트 — Auth 세션 자동 처리
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
