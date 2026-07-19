'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { useState } from 'react';

// PRD §10.1: TanStack Query — 비기능 §성능 ≤ 5s 추천 응답을 위한 캐싱
// SessionProvider — 헤더 로그인/로그아웃 토글 등 클라이언트 세션 조회용
// (세션은 클라이언트에서 /api/auth/session 으로 가져오므로 정적 페이지는 정적 유지)
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1분: 추천 결과 신선도
            gcTime: 5 * 60 * 1000, // 5분: 캐시 유지
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
