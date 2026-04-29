import type { NextAuthConfig } from 'next-auth';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';

// Edge Runtime 호환 — DB 어댑터/Node API 사용 금지 (middleware.ts 에서 import)
// 풀 구성은 auth.ts (SupabaseAdapter 포함)

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
  session: { strategy: 'jwt', maxAge: 60 * 60, updateAge: 30 * 24 * 60 * 60 },
  callbacks: {
    authorized({ request: { nextUrl }, auth }) {
      const protectedPaths = ['/me', '/admin'];
      const isProtected = protectedPaths.some((p) => nextUrl.pathname.startsWith(p));
      if (isProtected) return !!auth?.user;
      return true;
    },
  },
} satisfies NextAuthConfig;
