import { SignJWT } from 'jose';

// PRD §10.2 / §14 — Auth.js 세션 → Supabase 호환 access token 발급 (Node Runtime 전용)
// 발급한 JWT는 (1) Edge Function이 SB_JWT_SECRET(=Supabase JWT Secret)으로 로컬 검증하고
//             (2) PostgREST/RLS가 sub 를 auth.uid() 로 인식한다.
// sub = public.users.id (recommendations.user_id 등 FK 대상)

const encoder = new TextEncoder();

export async function signSupabaseAccessToken(params: {
  userId: string;
  email?: string | null;
  /** 기본 1h (PRD §14: JWT 1h) */
  expiresInSec?: number;
}): Promise<string> {
  const secret = process.env.SB_JWT_SECRET;
  if (!secret) throw new Error('SB_JWT_SECRET 미설정 (.env.local / Supabase JWT Secret)');

  const ttl = params.expiresInSec ?? 60 * 60;
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    role: 'authenticated',
    ...(params.email ? { email: params.email } : {}),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(params.userId)
    .setAudience('authenticated')
    .setIssuer('supabase')
    .setIssuedAt(now)
    .setExpirationTime(now + ttl)
    .sign(encoder.encode(secret));
}
