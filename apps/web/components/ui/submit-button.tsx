'use client';

import { useFormStatus } from 'react-dom';
import { LoadingOverlay } from './loading-overlay';

// 서버 액션 폼 제출 버튼 — 제출 중 전면 오버레이(정중앙 비숑) + 중복 제출 방지.
// 로그인(OAuth signIn) 등 <form action={...}> 안에서 사용.

export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" disabled={pending} className={className}>
        {children}
      </button>
      <LoadingOverlay show={pending} />
    </>
  );
}
