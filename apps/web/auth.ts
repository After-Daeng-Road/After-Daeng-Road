import NextAuth from 'next-auth';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import authConfig from './auth.config';

// PRD §10.1, §14: Auth.js v5 풀 구성 (SupabaseAdapter 포함 — Node Runtime)
// middleware 에서는 ./auth.config.ts 만 import (Edge Runtime 호환)

// env 미설정 / placeholder 상태에서는 adapter 없이 동작 (JWT-only) — UI 탐색용
function makeAdapter() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return undefined;
  if (url.includes('[PROJECT-REF]') || !/^https?:\/\//.test(url)) return undefined;
  try {
    new URL(url);
  } catch {
    return undefined;
  }
  return SupabaseAdapter({ url, secret });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: makeAdapter(),
});
