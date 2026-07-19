'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { COPY } from '@/lib/copy';

// 이메일 알림 밴드 — 매일 저녁 6시 한적한 길 메일 (PRD §16.4 / DESIGN_SYSTEM §9.1)
// 좌: 샌드색 카피 + 세리프 강조어 + 이메일 입력/구독, 우: 반려견 산책 사진.
// 구독은 로그인 + 설정 기반(PRD §16.4)이므로, 입력 후 /me/settings 로 이메일을 넘겨 이어서 켬.

const B = COPY.home.band;

export function EmailCta() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    // 알림 설정은 로그인 사용자 기준 — 입력 이메일을 쿼리로 넘겨 설정 화면에서 이어 켬
    const target = trimmed
      ? `/me/settings?subscribe=1&email=${encodeURIComponent(trimmed)}`
      : '/me/settings?subscribe=1';
    router.push(target);
  };

  return (
    <div className="mb-8 mt-8 grid min-h-[200px] grid-cols-1 overflow-hidden rounded-card border border-line md:grid-cols-[1fr_300px]">
      <div className="flex flex-col justify-center bg-cta p-7 sm:p-11">
        <div className="eyebrow !text-brand-ink">{B.eyebrow}</div>
        <h3 className="mt-3 text-[clamp(21px,2.6vw,28px)] font-bold leading-[1.18] tracking-[-0.02em] text-ink">
          {B.titleLead}
          <em className="font-serif font-light italic text-brand-ink">{B.titleEmph}</em>
          {B.titleTail}
          <br />
          {B.title2}
        </h3>
        <form onSubmit={handleSubscribe} className="mt-[22px] flex max-w-[420px] gap-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={B.placeholder}
            aria-label={B.placeholder}
            className="h-12 flex-1 rounded-full border border-line bg-surface-2 px-[18px] text-[14px] text-body placeholder:text-faint focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-brand px-6 text-[14px] font-bold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition duration-200 ease-ds hover:translate-y-[-1px] hover:brightness-[1.04] dark:text-[#20160f]"
          >
            {B.submit}
          </button>
        </form>
        <p className="mt-3 text-[12px] text-muted">{B.note}</p>
      </div>
      <div className="relative hidden md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ref/band.jpg"
          alt={B.imageAlt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
