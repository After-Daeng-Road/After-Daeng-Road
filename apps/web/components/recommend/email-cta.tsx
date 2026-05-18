'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

// 이메일 알림 CTA — 매일 18시 한적도 추천 (PRD §16.4)
// dismissed 상태 자체 보유 — 페이지 마운트 동안만 유지

export function EmailCta() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <section className="mt-6 rounded-xl border border-yellow-200 bg-[#fff8e1] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <Mail className="h-4 w-4 text-brand" aria-hidden /> 매일 18시 한적도 추천을 메일로
            받아볼래요?
          </div>
          <div className="mt-1 text-[11px] text-gray-600">시간·요일 자율 설정 · 1탭 수신거부</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            className="rounded bg-gray-700 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800"
          >
            이메일 알림 켜기
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[10px] text-gray-500 underline"
          >
            나중에
          </button>
        </div>
      </div>
    </section>
  );
}
