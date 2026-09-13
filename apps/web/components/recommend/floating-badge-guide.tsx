'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, X } from 'lucide-react';
import { COPY } from '@/lib/copy';

// 우하단 플로팅 안내 — 검증 배지 가이드 (PRD §6.3 · UI 명세 4)
// 클릭 → 배지 조건(3명 방문 + EXIF 사진 + 6개월) 설명 모달. 이전에는 클릭하면 버튼이 사라지기만 했다.
// '오늘 하루 보지 않기' 는 localStorage 날짜로 당일 숨김 (인트로 스플래시와 같은 규약).

const G = COPY.home.badgeGuide;
const HIDE_KEY = 'daeng:badge-guide-hide-date';
const todayStr = () => new Date().toISOString().slice(0, 10);

export function FloatingBadgeGuide() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  // 마운트 후 판단 — SSR 하이드레이션 안전
  useEffect(() => {
    try {
      if (localStorage.getItem(HIDE_KEY) === todayStr()) setHidden(true);
    } catch {
      /* localStorage 불가 환경이면 표시 */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const hideToday = () => {
    try {
      localStorage.setItem(HIDE_KEY, todayStr());
    } catch {
      /* 저장 실패 시 이번 방문만 숨김 */
    }
    setOpen(false);
    setHidden(true);
  };

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full bg-brand text-[10px] font-bold text-white shadow-lift transition duration-200 ease-ds hover:-translate-y-0.5 hover:brightness-[1.04] dark:text-[#20160f]"
        aria-label={COPY.home.floatingBadgeAria}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <BadgeCheck className="h-5 w-5" aria-hidden />
        {COPY.home.floatingBadge}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-guide-title"
          className="fixed inset-0 z-50 grid place-items-center px-4"
        >
          <button
            type="button"
            aria-label={G.close}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-sm rounded-card border border-line bg-surface p-5 shadow-lift">
            <div className="flex items-start justify-between gap-3">
              <h3
                id="badge-guide-title"
                className="flex items-center gap-2 text-[15px] font-bold text-ink"
              >
                <BadgeCheck className="h-5 w-5 text-verify" aria-hidden /> {G.title}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={G.close}
                className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{G.desc}</p>
            <ol className="mt-3 space-y-1.5">
              {G.rules.map((rule, i) => (
                <li key={rule} className="flex items-start gap-2 text-[13px] text-body">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--verify)_15%,transparent)] text-[11px] font-bold text-verify">
                    {i + 1}
                  </span>
                  {rule}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] text-faint">{G.how}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={hideToday}
                className="flex-1 rounded-field border border-line bg-surface-2 py-2.5 text-xs font-medium text-muted transition-colors hover:text-ink"
              >
                {G.hideToday}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-field bg-brand py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover dark:text-[#20160f]"
              >
                {G.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
