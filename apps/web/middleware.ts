import NextAuth from 'next-auth';
import authConfig from './auth.config';

// Edge Runtime — DB 어댑터 없는 가벼운 config 만 사용
// 보호 경로 정책은 auth.config.ts callbacks.authorized 에서 처리
const { auth } = NextAuth(authConfig);

export default auth((_req) => {
  // 추가 logic 필요 시 여기에. 현재는 callbacks.authorized 가 모두 처리
});

// 보호 경로에만 건다 (auth.config.ts callbacks.authorized 의 protectedPaths 와 일치).
// 전 경로에 걸면 프리렌더된 정적 페이지(/legal/*, /api-docs 등)까지 매 요청 오리진으로
// 가서 CDN 캐시가 무효가 된다 — 실측 x-vercel-cache: MISS, cache-control max-age=0.
export const config = {
  matcher: ['/me/:path*', '/admin/:path*'],
};
