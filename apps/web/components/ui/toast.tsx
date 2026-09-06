'use client';

// 공통 토스트 — ToastProvider 로 감싸고 useToast() 로 어디서든 호출.
//   const toast = useToast();
//   toast('로그인 후 이용할 수 있어요');            // 기본(브랜드 발바닥)
//   toast('후기가 등록됐어요', 'success');          // 성공(세이지 체크)
//   toast('저장에 실패했어요', 'error');            // 실패(로즈 경고)
// 상단 중앙(헤더 아래) 스택, 2.8초 후 자동 소멸.
// quiet-luxury: surface 필 + line 보더 + 시맨틱 색 아이콘 (라이트/다크 토큰 대응).

import { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, PawPrint } from 'lucide-react';

type ToastVariant = 'default' | 'success' | 'error';
type ToastItem = { id: number; message: string; variant: ToastVariant };

const ToastContext = createContext<((message: string, variant?: ToastVariant) => void) | null>(
  null,
);

const ICON: Record<ToastVariant, React.ReactNode> = {
  default: <PawPrint className="h-4 w-4 text-brand" aria-hidden />,
  success: <CheckCircle2 className="h-4 w-4 text-quiet" aria-hidden />,
  error: <AlertCircle className="h-4 w-4 text-verify" aria-hidden />,
};

const DURATION_MS = 2800;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, variant: ToastVariant = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-20 z-[120] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="flex max-w-[92vw] animate-[toast-in_0.25s_ease-out] items-center gap-2.5 rounded-full border border-line bg-white py-2.5 pl-4 pr-5 text-[13.5px] font-medium text-[#1d1813] shadow-lift"
          >
            {ICON[t.variant]}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast 는 ToastProvider 내부에서만 사용할 수 있어요');
  return show;
}
