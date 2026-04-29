import NextAuth from 'next-auth';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import authConfig from './auth.config';

// PRD §10.1, §14: Auth.js v5 풀 구성 (SupabaseAdapter 포함 — Node Runtime)
// middleware 에서는 ./auth.config.ts 만 import (Edge Runtime 호환)

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
});
