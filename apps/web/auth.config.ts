import type { NextAuthConfig } from 'next-auth';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';

// Edge Runtime 호환 — DB 어댑터/Node API 사용 금지 (middleware.ts 에서 import)
// 풀 구성은 auth.ts (SupabaseAdapter 포함)

const useSecure = process.env.NODE_ENV === 'production';

export default {
  providers: [
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
    }),
    Naver({
      clientId: process.env.AUTH_NAVER_ID,
      clientSecret: process.env.AUTH_NAVER_SECRET,
    }),
  ],
  pages: { signIn: '/login' },
  // PRD §14: JWT 1h / refresh 30d
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,
    updateAge: 30 * 24 * 60 * 60,
  },
  // PRD §14 OWASP 강화 — secure / sameSite=lax / httpOnly
  cookies: {
    sessionToken: {
      name: useSecure ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecure,
      },
    },
    callbackUrl: {
      name: useSecure ? '__Secure-authjs.callback-url' : 'authjs.callback-url',
      options: { sameSite: 'lax', path: '/', secure: useSecure },
    },
    csrfToken: {
      name: useSecure ? '__Host-authjs.csrf-token' : 'authjs.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: useSecure },
    },
  },
  // PRD §14 신뢰 호스트 (CSRF + Open Redirect 방어)
  trustHost: true,
  callbacks: {
    authorized({ request: { nextUrl }, auth }) {
      const protectedPaths = ['/me', '/admin'];
      const isProtected = protectedPaths.some((p) => nextUrl.pathname.startsWith(p));
      if (isProtected) return !!auth?.user;
      return true;
    },
  },
} satisfies NextAuthConfig;
