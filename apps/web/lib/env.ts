import { z } from 'zod';

// PRD §10.1 외부 의존성 — env 검증
// 모듈 import 시점이 아닌 첫 사용 시점에 검증 (빌드/Vercel preview 안정성)
// NEXT_PUBLIC_* 는 빌드 시 정적 인라인되므로 직접 process.env 참조 필요

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(32),
  AUTH_KAKAO_ID: z.string(),
  AUTH_KAKAO_SECRET: z.string(),
  AUTH_NAVER_ID: z.string(),
  AUTH_NAVER_SECRET: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  KAKAO_REST_API_KEY: z.string(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
  RESEND_API_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  TOUR_API_SERVICE_KEY: z.string(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  NEXT_PUBLIC_KAKAO_JS_KEY: z.string(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

let _server: z.infer<typeof serverSchema> | null = null;
let _client: z.infer<typeof clientSchema> | null = null;

export function serverEnv(): z.infer<typeof serverSchema> {
  if (_server) return _server;
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    console.error('[env] 서버 환경 변수 검증 실패:', result.error.flatten().fieldErrors);
    throw new Error('서버 env 누락. .env.local 확인');
  }
  _server = result.data;
  return _server;
}

export function clientEnv(): z.infer<typeof clientSchema> {
  if (_client) return _client;
  // NEXT_PUBLIC_* 는 빌드 타임 정적 치환 → 명시적 참조 필수
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_KAKAO_JS_KEY: process.env.NEXT_PUBLIC_KAKAO_JS_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  };
  const result = clientSchema.safeParse(raw);
  if (!result.success) {
    console.error('[env] 클라이언트 환경 변수 검증 실패:', result.error.flatten().fieldErrors);
    throw new Error('클라이언트 env 누락. .env.local 확인');
  }
  _client = result.data;
  return _client;
}
