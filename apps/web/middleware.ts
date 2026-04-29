import NextAuth from 'next-auth';
import authConfig from './auth.config';

// Edge Runtime — DB 어댑터 없는 가벼운 config 만 사용
// 보호 경로 정책은 auth.config.ts callbacks.authorized 에서 처리
const { auth } = NextAuth(authConfig);

export default auth((_req) => {
  // 추가 logic 필요 시 여기에. 현재는 callbacks.authorized 가 모두 처리
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
