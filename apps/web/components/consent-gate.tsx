'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { ShieldCheck } from 'lucide-react';
import { getConsentStatus, recordConsent } from '@/lib/actions/consent';
import { REQUIRED_CONSENTS } from '@/lib/constants';
import { COPY } from '@/lib/copy';

// PRD §14 — 온보딩 필수 동의 게이트 (QA #4 후속).
// 카카오 로그인엔 가입 폼이 없으므로, 로그인 후 필수 동의(TERMS·PRIVACY)가 없는 유저에게
// 전면 모달을 띄워 recordConsent 로 적재한다. 필수 동의 전에는 닫을 수 없다(로그아웃만 가능).
// 선택 동의(MARKETING_EMAIL)는 체크한 경우에만 함께 기록 — LOCATION 은 위치 사용 시점에 별도 수집.

const C = COPY.consent;

type Row = {
  key: 'TERMS' | 'PRIVACY' | 'MARKETING_EMAIL';
  label: string;
  required: boolean;
  href?: string;
  desc?: string;
};

const ROWS: Row[] = [
  { key: 'TERMS', label: C.terms, required: true, href: '/legal/terms' },
  { key: 'PRIVACY', label: C.privacy, required: true, href: '/legal/privacy' },
  { key: 'MARKETING_EMAIL', label: C.marketing, required: false, desc: C.marketingDesc },
];

export function ConsentGate() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<Row['key'], boolean>>({
    TERMS: false,
    PRIVACY: false,
    MARKETING_EMAIL: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 로그인 확인 후 1회만 조회 — 필수 동의가 하나라도 없으면 게이트 오픈
  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    getConsentStatus().then((latest) => {
      if (cancelled) return;
      const missing = REQUIRED_CONSENTS.some((k) => !latest[k]?.agreed);
      setOpen(missing);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  // 게이트가 열린 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const allChecked = ROWS.every((r) => checked[r.key]);
  const requiredOk = ROWS.filter((r) => r.required).every((r) => checked[r.key]);

  const toggleAll = () => {
    const next = !allChecked;
    setChecked({ TERMS: next, PRIVACY: next, MARKETING_EMAIL: next });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredOk) {
      setError(C.requiredError);
      return;
    }
    setError(null);
    startTransition(async () => {
      const consents = ROWS.filter((r) => r.required || checked[r.key]).map((r) => ({
        kind: r.key,
        agreed: true,
      }));
      const res = await recordConsent({ consents });
      if (res.ok) setOpen(false);
      else setError(C.saveError);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-gate-title"
      className="fixed inset-0 z-50 grid place-items-center px-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-lift"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-brand" aria-hidden />
          <h2 id="consent-gate-title" className="text-lg font-bold text-ink">
            {C.title}
          </h2>
        </div>
        <p className="mt-1.5 text-sm text-muted">{C.desc}</p>

        <label className="mt-5 flex items-center gap-2.5 rounded-field border border-line bg-surface-2 px-3.5 py-3">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            className="h-4 w-4 accent-brand"
          />
          <span className="text-sm font-bold text-ink">{C.agreeAll}</span>
        </label>

        <ul className="mt-2 space-y-1">
          {ROWS.map((r) => (
            <li key={r.key} className="flex items-start gap-2.5 px-3.5 py-2">
              <input
                id={`consent-${r.key}`}
                type="checkbox"
                checked={checked[r.key]}
                onChange={() => setChecked((prev) => ({ ...prev, [r.key]: !prev[r.key] }))}
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <div className="min-w-0 flex-1">
                <label htmlFor={`consent-${r.key}`} className="text-sm text-body">
                  <span
                    className={`mr-1.5 text-xs font-semibold ${r.required ? 'text-brand' : 'text-faint'}`}
                  >
                    [{r.required ? C.requiredTag : C.optionalTag}]
                  </span>
                  {r.label}
                </label>
                {r.desc && <p className="mt-0.5 text-xs text-faint">{r.desc}</p>}
              </div>
              {r.href && (
                <Link
                  href={r.href}
                  target="_blank"
                  className="flex-shrink-0 text-xs text-muted underline hover:text-body"
                >
                  {C.view}
                </Link>
              )}
            </li>
          ))}
        </ul>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={isPending || !requiredOk}
          className="mt-4 w-full rounded-field bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50 dark:text-[#20160f]"
        >
          {isPending ? C.submitting : C.submit}
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-2 w-full py-1.5 text-xs text-faint hover:text-muted"
        >
          {C.signOut}
        </button>
      </form>
    </div>
  );
}
