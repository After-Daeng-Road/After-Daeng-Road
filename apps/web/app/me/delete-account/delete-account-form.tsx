'use client';

// 회원 탈퇴 폼 — 되돌릴 수 없는 조작이라 확인 문구 입력을 요구한다.
// 완료 후에는 반드시 로그아웃한다: 세션 JWT 는 최초 로그인 때만 DB 를 보므로
// 탈퇴 후에도 남은 토큰으로 잠시 접근이 가능하다.

import { useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import { deleteAccount } from '@/lib/actions/account';
import { DELETE_CONFIRM_TEXT } from '@/lib/constants';
import { COPY } from '@/lib/copy';

const C = COPY.account;

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const matches = text.trim() === DELETE_CONFIRM_TEXT;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!matches) {
      setError(C.mismatch);
      return;
    }
    startTransition(async () => {
      const res = await deleteAccount({ confirmText: text.trim() });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // 되돌릴 수 없는 조작이라 결과를 먼저 보여준다.
      // 로그아웃은 사용자가 확인 버튼을 누를 때 — 임의의 지연 후 화면이 사라지지 않게.
      setDone(true);
    });
  };

  // 완료 화면. 로그아웃을 여기서 하는 이유: 세션 JWT 는 최초 로그인 때만 DB 를 보므로
  // 탈퇴 후에도 남은 토큰으로 잠시 접근이 가능하다. 반드시 끊어야 한다.
  if (done) {
    return (
      <section className="mt-10 rounded-card border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">{C.dangerTitle}</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">{C.done}</p>
        <button
          type="button"
          onClick={() => signOut({ redirectTo: '/' })}
          className="mt-4 rounded-field bg-ink px-4 py-2 text-xs font-semibold text-page transition hover:opacity-90"
        >
          {C.doneAction}
        </button>
      </section>
    );
  }

  return (
    <section
      id="delete-account"
      className="mt-10 scroll-mt-20 rounded-card border border-danger-soft bg-surface p-5"
    >
      <h2 className="text-sm font-semibold text-danger">{C.dangerTitle}</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted">{C.dangerDesc}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-faint">{C.keepNotice}</p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-field border border-danger px-4 py-2 text-xs font-semibold text-danger transition hover:bg-danger hover:text-page"
        >
          {C.dangerTitle}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label htmlFor="delete-confirm" className="block text-xs text-ink">
            {C.confirmLabel(DELETE_CONFIRM_TEXT)}
          </label>
          <input
            id="delete-confirm"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={C.confirmPlaceholder}
            autoComplete="off"
            className="w-full rounded-field border border-line bg-page px-3 py-2 text-sm text-ink placeholder:text-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          />
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!matches || isPending}
              className="rounded-field bg-danger px-4 py-2 text-xs font-semibold text-page transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? C.submitting : C.submit}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setText('');
                setError(null);
              }}
              disabled={isPending}
              className="rounded-field border border-line px-4 py-2 text-xs text-muted transition hover:text-ink"
            >
              취소
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
