'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// PRD §20 리스크 매트릭스: Sentry 자동 리포트
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
    // Sentry 자동 캡처는 instrumentation.ts 가 처리
  }, [error]);

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" aria-hidden />
      <h1 className="mt-3 text-xl font-bold">잠시 문제가 생겼어요</h1>
      <p className="mt-2 text-sm text-gray-600">
        {error.digest && <span className="block text-xs text-gray-400">code: {error.digest}</span>}
        다시 시도해 주세요. 계속되면 메일로 알려주세요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover"
      >
        <RotateCcw className="h-4 w-4" aria-hidden /> 다시 시도
      </button>
    </main>
  );
}
