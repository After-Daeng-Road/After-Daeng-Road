'use client';

// 댕로드 홈 인터랙티브 본문 — 히어로 · 시간슬라이더 콘솔 · 추천 결과 · 이메일 밴드
// pets 는 서버(page.tsx)에서 listPets() 로 조회해 주입 (하드코딩 데모 제거).

import { useState, useTransition } from 'react';
import { z } from 'zod';
import { COPY } from '@/lib/copy';
import { DEMO_RECOMMENDATIONS, TIME_DEFAULT, TIME_MAX } from '@/lib/constants';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EmailCta } from '@/components/recommend/email-cta';
import { FloatingBadgeGuide } from '@/components/recommend/floating-badge-guide';
import { RecommendForm } from '@/components/recommend/recommend-form';
import { RecommendResults } from '@/components/recommend/recommend-results';
import type { Pet, Recommendation, RecommendInput } from '@/lib/types/recommendation';

// ───────── 스키마 ─────────

const RecommendInputSchema = z.object({
  petId: z.string().nullable(),
  timeHours: z.number().min(1).max(6),
  startAt: z.string(),
  departure: z.object({
    lat: z.number(),
    lng: z.number(),
    label: z.string().optional(),
  }),
});

const HERO = COPY.home.hero;

export function HomeRecommend({ pets }: { pets: Pet[] }) {
  // 폼 상태 — timeHours 만 EmptyResult.onRelax 에서 외부 조작 위해 페이지에 잔류
  const [timeHours, setTimeHours] = useState(TIME_DEFAULT);

  // 결과 상태 — 초기엔 데모 추천 표시, 실제 검색 응답이 오면 교체
  const [results, setResults] = useState<Recommendation[] | null>(DEMO_RECOMMENDATIONS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRecommend = (input: RecommendInput) => {
    setError(null);
    startTransition(async () => {
      try {
        RecommendInputSchema.parse(input);

        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        if (res.status === 429) {
          throw new Error(COPY.home.errors.rateLimit);
        }
        if (!res.ok) {
          throw new Error(COPY.home.errors.apiFail(res.status));
        }
        const data: { recommendations: Recommendation[] } = await res.json();
        setResults(data.recommendations);
      } catch (e) {
        setError(e instanceof Error ? e.message : COPY.home.errors.unknown);
      }
    });
  };

  return (
    <>
      {/* ═════ 히어로 ═════ */}
      <section className="px-5 pt-14 sm:px-8 sm:pt-20 lg:px-14 lg:pt-24">
        <div className="relative mx-auto flex min-h-[480px] max-w-[1240px] items-end overflow-hidden rounded-card shadow-lift sm:min-h-[560px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/ref/hero.jpg"
            alt={HERO.imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/5 to-[var(--scrim)]"
            aria-hidden
          />
          <div className="relative z-[2] max-w-[760px] p-7 text-white sm:p-12 lg:p-[60px]">
            <div className="eyebrow !text-white/80">{HERO.eyebrow}</div>
            <h1 className="mt-4 text-[clamp(40px,6.4vw,82px)] font-bold leading-[1.02] tracking-[-0.035em]">
              {HERO.titleLead}
              <br />
              {HERO.titleMid}{' '}
              <em className="font-serif font-light italic tracking-[-0.01em] text-[#ffd9c6]">
                {HERO.titleEmph}
              </em>{' '}
              {HERO.titleTail}
            </h1>
            <p className="mt-5 max-w-[540px] text-[clamp(15px,1.6vw,18px)] leading-[1.6] text-white/85">
              {HERO.lede}
            </p>
          </div>
        </div>
      </section>

      {/* ═════ 검색 콘솔 (히어로에 겹쳐 뜸) ═════ */}
      <div className="relative z-[5] mx-auto -mt-14 max-w-[1080px] px-5 sm:px-8 lg:px-14">
        <RecommendForm
          pets={pets}
          timeHours={timeHours}
          onTimeHoursChange={setTimeHours}
          loading={isPending}
          onSubmit={handleRecommend}
        />
        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}
      </div>

      {/* ═════ 추천 결과 ═════ */}
      <main className="mx-auto max-w-[1080px] px-5 sm:px-8 lg:px-14">
        <RecommendResults
          results={results}
          loading={isPending}
          timeHours={timeHours}
          onRelax={() => setTimeHours(Math.min(TIME_MAX, timeHours + 1))}
        />

        {/* ═════ 이메일 밴드 ═════ */}
        <EmailCta />
      </main>

      {/* ═════ 검증 배지 가이드 플로팅 ═════ */}
      <FloatingBadgeGuide />
    </>
  );
}
