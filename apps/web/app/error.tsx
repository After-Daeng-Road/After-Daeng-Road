'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { COPY } from '@/lib/copy';

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
      <AlertTriangle className="mx-auto h-12 w-12 text-danger" aria-hidden />
      <h1 className="mt-3 text-xl font-bold text-ink">{COPY.error.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {error.digest && (
          <span className="block text-xs text-faint">
            {COPY.error.codePrefix}
            {error.digest}
          </span>
        )}
        {COPY.error.desc}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-1.5 rounded-field bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover dark:text-[#20160f]"
      >
        <RotateCcw className="h-4 w-4" aria-hidden /> {COPY.error.retry}
      </button>
    </main>
  );
}
