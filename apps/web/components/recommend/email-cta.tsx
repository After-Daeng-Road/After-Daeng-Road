'use client';

import { useState } from 'react';
import Link from 'next/link';

// 이메일 알림 밴드 — 매일 저녁 6시 한적한 길 메일 (PRD §16.4 / DESIGN_SYSTEM §5 EmailCta)
// 좌: 샌드색 카피 + 세리프 강조어 + 잉크 CTA, 우: 반려견 산책 사진.
// dismissed 상태 자체 보유 — 페이지 마운트 동안만 유지.

export function EmailCta() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="mt-8 grid min-h-[200px] grid-cols-1 overflow-hidden rounded-card border border-line md:grid-cols-[1fr_300px]">
      <div className="flex flex-col justify-center bg-cta p-7 sm:p-11">
        <div className="eyebrow !text-brand-ink">매일 저녁 6시</div>
        <h3 className="mt-3 text-[clamp(21px,2.6vw,28px)] font-bold leading-[1.18] tracking-[-0.02em] text-ink">
          오늘의 <em className="font-serif font-light italic text-brand-ink">한적한 길</em>을
          <br />
          메일로 받아보세요
        </h3>
        <p className="mt-2 text-[13px] text-muted">시간·요일 자율 설정 · 1탭 수신거부</p>
        <div className="mt-6 flex max-w-[420px] items-center gap-2.5">
          <Link
            href="/me/settings"
            className="inline-flex h-[48px] items-center justify-center rounded-full bg-ink px-6 text-[14px] font-semibold text-page transition-opacity duration-200 ease-ds hover:opacity-85"
          >
            이메일 알림 켜기
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-[13px] text-muted underline-offset-2 hover:underline"
          >
            나중에
          </button>
        </div>
      </div>
      <div className="relative hidden md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ref/band.jpg"
          alt="반려견과의 산책"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
