import { ApiReference } from '@scalar/nextjs-api-reference';

// GET /api-docs/reference
// 인터랙티브 Swagger(Scalar). /api-docs/openapi.json 을 렌더하며 "Try it out" 지원.
// ⚠️ Scalar 번들은 jsDelivr CDN에서 로드된다 → next.config.mjs 의 /api-docs 전용 CSP가 이를 허용.
//   (그 외 경로의 엄격 CSP는 그대로 유지)
export const GET = ApiReference({
  url: '/api-docs/openapi.json',
  pageTitle: '댕로드 API — Swagger',
  // 브랜드 오렌지 액센트 (앱 디자인 토큰 #f56500)
  customCss: `:root { --scalar-color-accent: #f56500; --scalar-color-accent-hover: #e65a00; }`,
});
