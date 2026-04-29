// PRD §10.1, §14: Cloudflare Turnstile — 봇 방지 (가입·체크인·후기 폼)
// 클라이언트가 받은 token 을 서버에서 verify (siteverify API)

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // 개발 환경 — 시크릿 미설정 시 통과시킴 (운영 배포 전 반드시 설정)
    if (process.env.NODE_ENV === 'production') {
      console.error('[turnstile] TURNSTILE_SECRET_KEY 미설정 (운영)');
      return false;
    }
    return true;
  }

  if (!token) return false;

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.set('remoteip', remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) return false;
    const data: { success: boolean; 'error-codes'?: string[] } = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}
