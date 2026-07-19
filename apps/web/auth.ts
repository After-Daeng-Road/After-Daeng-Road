import NextAuth from 'next-auth';
import authConfig from './auth.config';
import { upsertOAuthUser } from '@/lib/auth/upsert-user';
import { signSupabaseAccessToken } from '@/lib/auth/supabase-jwt';

// PRD §10.1 / §14 — Auth.js v5 풀 구성 (Node Runtime)
// 설계(A안): DB 어댑터 미사용. 유저 정본은 public.users (Prisma) — recommendations.user_id 등 FK 대상.
//  - jwt 콜백: 최초 OAuth 로그인 시 provider id 로 public.users upsert → token.userId(=public.users.id)
//  - session 콜백: token.userId 를 세션 user.id + Supabase RLS/Edge 용 access token(sub=user.id)으로 발급
// middleware 는 ./auth.config.ts 만 import (Edge Runtime 호환 — DB/crypto 콜백 제외)

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account, profile }) {
      // 최초 로그인 시점에만 upsert (이후 토큰 갱신 호출은 그대로 통과)
      if (account && user) {
        const email = (profile as { email?: string } | undefined)?.email ?? user.email ?? null;
        const dbUser = await upsertOAuthUser({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email,
          nickname: user.name ?? null,
        });
        token.userId = dbUser.id;
        token.role = dbUser.role;
        token.email = email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.supabaseAccessToken = await signSupabaseAccessToken({
          userId: token.userId,
          email: token.email ?? session.user.email ?? null,
        });
      }
      return session;
    },
  },
});
