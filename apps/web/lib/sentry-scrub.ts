// Sentry v8: 타입은 @sentry/nextjs 의 namespace 로 export
type SentryEvent = Parameters<
  NonNullable<import('@sentry/nextjs').BrowserOptions['beforeSend']>
>[0];
type SentryEventHint = Parameters<
  NonNullable<import('@sentry/nextjs').BrowserOptions['beforeSend']>
>[1];

// PRD §14: 개인정보 최소화 — Sentry 이벤트에서 PII 제거
// 이메일, 카카오/네이버 ID, 좌표, 전화번호 등 마스킹

const PII_PATTERNS = [
  // 이메일
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // 한국 휴대폰 번호
  /01[0-9]-?\d{3,4}-?\d{4}/g,
  // 좌표 (소수점 4자리 이상)
  /\b\d{2,3}\.\d{4,}\s*,\s*\d{2,3}\.\d{4,}\b/g,
  // UUID (사용자 ID 노출 방지 — Sentry user 필드는 별도 처리)
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
];

function scrub(text: string): string {
  let result = text;
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

function scrubObject(obj: unknown): unknown {
  if (typeof obj === 'string') return scrub(obj);
  if (Array.isArray(obj)) return obj.map(scrubObject);
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // 민감 키 자체 제거
      if (/email|phone|password|secret|token|kakao_?id|naver_?id|access[-_]token/i.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = scrubObject(value);
      }
    }
    return result;
  }
  return obj;
}

export function beforeSend(event: SentryEvent, _hint: SentryEventHint): SentryEvent | null {
  // 1. 메시지 / breadcrumb 마스킹
  if (event.message) event.message = scrub(event.message);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b: { message?: string; data?: unknown }) => ({
      ...b,
      message: b.message ? scrub(b.message) : b.message,
      data: scrubObject(b.data) as Record<string, unknown> | undefined,
    }));
  }

  // 2. exception value 마스킹
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((v: { value?: string }) => ({
      ...v,
      value: v.value ? scrub(v.value) : v.value,
    }));
  }

  // 3. request 정보 — 민감 헤더 제거
  if (event.request?.headers) {
    const headers = event.request.headers as Record<string, string>;
    delete headers['authorization'];
    delete headers['cookie'];
    delete headers['x-supabase-auth'];
    event.request.headers = headers;
  }
  if (event.request?.data) {
    event.request.data = scrubObject(event.request.data) as typeof event.request.data;
  }

  // 4. user 정보 — id 만 보내고 이메일/이름 제거
  if (event.user) {
    event.user = {
      id: event.user.id, // 추적용 보존
      // email/username/ip_address 등 제거
    };
  }

  // 5. extra / contexts
  if (event.extra) event.extra = scrubObject(event.extra) as typeof event.extra;
  if (event.contexts) event.contexts = scrubObject(event.contexts) as typeof event.contexts;

  return event;
}
