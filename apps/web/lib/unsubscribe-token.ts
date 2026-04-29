import crypto from 'node:crypto';

// PRD §14, §16.4 — 1-tap unsubscribe HMAC 토큰 (사용자 ID 평문 노출 방지)
// 토큰 = base64url(userId + ':' + ts) + '.' + base64url(HMAC-SHA256)

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET 미설정');
  return s;
}

function b64url(s: string | Buffer): string {
  return Buffer.from(s as string).toString('base64url');
}

function fromB64url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

const TOKEN_TTL_DAYS = 30;

export function makeUnsubscribeToken(userId: string): string {
  const ts = Date.now().toString();
  const payload = b64url(`${userId}:${ts}`);
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string,
): { ok: true; userId: string } | { ok: false; error: string } {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return { ok: false, error: '토큰 형식 오류' };

  const expectedSig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');

  // Timing-safe 비교
  const sigBuf = Buffer.from(sig, 'base64url');
  const expectedBuf = Buffer.from(expectedSig, 'base64url');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, error: '서명 불일치' };
  }

  let userId: string;
  let ts: number;
  try {
    const [u, t] = fromB64url(payload).split(':');
    if (!u || !t) throw new Error('payload 형식 오류');
    userId = u;
    ts = Number(t);
  } catch {
    return { ok: false, error: 'payload 파싱 실패' };
  }

  // 만료 검증
  const ageMs = Date.now() - ts;
  if (ageMs < 0 || ageMs > TOKEN_TTL_DAYS * 24 * 3600 * 1000) {
    return { ok: false, error: '토큰 만료' };
  }

  return { ok: true, userId };
}
