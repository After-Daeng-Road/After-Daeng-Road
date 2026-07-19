import type { DefaultSession } from 'next-auth';

// Auth.js v5 타입 보강 — JWT 브리지(session.supabaseAccessToken) + public.users.id 매핑

declare module 'next-auth' {
  interface Session {
    /** Supabase RLS/Edge Function 호출용 access token (sub = public.users.id) */
    supabaseAccessToken?: string;
    user: {
      id: string;
      role?: string;
    } & DefaultSession['user'];
  }
}

// v5: JWT 인터페이스 선언 위치는 @auth/core/jwt (next-auth/jwt 는 re-export)
declare module '@auth/core/jwt' {
  interface JWT {
    /** public.users.id */
    userId?: string;
    role?: string;
  }
}
