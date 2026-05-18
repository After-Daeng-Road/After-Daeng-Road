'use client';

import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';

// 우하단 플로팅 안내 — 검증 배지 가이드 (PRD §6.3)
// dismissed 상태 자체 보유 — 페이지 마운트 동안만 유지

export function FloatingBadgeGuide() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <button
      type="button"
      onClick={() => setDismissed(true)}
      className="fixed bottom-5 right-5 flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full bg-brand text-[10px] font-bold text-white shadow-lg hover:bg-brand-hover"
      aria-label="검증 배지 안내"
    >
      <BadgeCheck className="h-5 w-5" aria-hidden />
      검증 배지
    </button>
  );
}
