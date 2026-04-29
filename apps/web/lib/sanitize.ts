import DOMPurify from 'isomorphic-dompurify';

// PRD §14.1 OWASP XSS — 사용자 입력은 항상 sanitize
// 후기/펫정책/벤더 답변 등 표시되는 텍스트에 적용

// 텍스트 전용 (HTML 태그 전부 제거)
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
    .trim()
    .slice(0, 5000); // PRD §16.3 후기 max 2000 — 여유 있게 5000 컷
}

// 후기 본문 (제한된 인라인 태그 + 줄바꿈만 허용)
export function sanitizeReviewBody(input: string): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['br', 'p', 'b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })
    .trim()
    .slice(0, 2000);
}

// URL 검증 (XSS·javascript: 차단)
export function sanitizeUrl(input: string): string | null {
  if (typeof input !== 'string') return null;
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
