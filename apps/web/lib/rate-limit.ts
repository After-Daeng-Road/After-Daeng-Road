import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { headers } from 'next/headers';

// PRD §13.5, §14: Upstash Rate Limit — 사용자별 분당 30회, IP 분당 60회
// 모든 Server Actions / Route Handlers 진입점에 적용.
// UPSTASH 미설정(로컬/개발) 시 fail-open — 레이트리밋을 건너뛴다. 설정 안 하면
// @upstash/ratelimit 이 빈 URL('/pipeline')로 fetch 해 "Invalid URL" 로 크래시하므로 반드시 가드.

const UPSTASH_ON = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export type LimiterKind = 'user' | 'ip' | 'daily';

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// 지연 생성 — UPSTASH 설정된 경우에만 인스턴스화 (빈 URL 로 Redis 만드는 것 회피)
let _limiters: Record<LimiterKind, Ratelimit> | null = null;
function getLimiters(): Record<LimiterKind, Ratelimit> {
  if (!_limiters) {
    _limiters = {
      user: new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        prefix: 'rl:user',
        analytics: false,
      }),
      ip: new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        prefix: 'rl:ip',
        analytics: false,
      }),
      // 후기/체크인 등 abuse-prone 액션 — 하루 50회
      daily: new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(50, '1 d'),
        prefix: 'rl:daily',
        analytics: false,
      }),
    };
  }
  return _limiters;
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfterSec: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export async function rateLimit(opts: {
  kind: LimiterKind;
  identifier: string;
}): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (!UPSTASH_ON) return { success: true, remaining: 999, reset: 0 }; // fail-open
  const { success, remaining, reset } = await getLimiters()[opts.kind].limit(opts.identifier);
  return { success, remaining, reset };
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    h.get('cf-connecting-ip') ??
    'unknown'
  );
}

// 헬퍼: 사용자 + IP 동시 체크 + 헤더 부착 가능 형태로 throw
export async function enforceRateLimit(args: {
  userId?: string;
  action: string;
  daily?: boolean;
}): Promise<void> {
  if (!UPSTASH_ON) return; // Upstash 미설정 → 레이트리밋 생략 (fail-open)

  const ip = await getClientIp();
  const ipKey = `${args.action}:${ip}`;
  const userKey = args.userId ? `${args.action}:${args.userId}` : null;

  const checks = [rateLimit({ kind: 'ip', identifier: ipKey })];
  if (userKey) checks.push(rateLimit({ kind: 'user', identifier: userKey }));
  if (args.daily && userKey) checks.push(rateLimit({ kind: 'daily', identifier: userKey }));

  const results = await Promise.all(checks);
  const failed = results.find((r) => !r.success);
  if (failed) {
    const retry = Math.max(0, Math.ceil((failed.reset - Date.now()) / 1000));
    throw new RateLimitError('요청이 너무 많아요. 잠시 후 다시 시도해주세요.', retry);
  }
}
