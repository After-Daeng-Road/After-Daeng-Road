'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// PRD §10.1: TanStack Query — 비기능 §성능 ≤ 5s 추천 응답을 위한 캐싱
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

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
