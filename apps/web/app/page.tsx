'use client';

// 댕로드 — 메인 화면 (히어로 · 시간슬라이더 콘솔 · 추천 결과 · 이메일 밴드)
// 참조: ui_kits/web 홈 (DESIGN_SYSTEM.md §9.1) — 에디토리얼 quiet-luxury

import { useState, useTransition } from 'react';
import { z } from 'zod';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EmailCta } from '@/components/recommend/email-cta';
import { FloatingBadgeGuide } from '@/components/recommend/floating-badge-guide';
import { RecommendForm } from '@/components/recommend/recommend-form';
import { RecommendResults } from '@/components/recommend/recommend-results';
import type { Pet, Recommendation, RecommendInput } from '@/lib/types/recommendation';

// ───────── 타입 / 스키마 ─────────

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

// ───────── 상수 ─────────

const TIME_MAX = 6;
const TIME_DEFAULT = 3;

// ───────── 페이지 ─────────

export default function HomePage() {
  // 폼 상태 — timeHours 만 EmptyResult.onRelax 에서 외부 조작 위해 페이지에 잔류
  const [timeHours, setTimeHours] = useState(TIME_DEFAULT);
  const [pets] = useState<Pet[]>([
    { id: 'p1', name: '다람이', breed: '푸들', weightKg: 5, ageYears: 3 }, // 데모용 (실제: GET /api/pets)
  ]);

  // 결과 상태
  const [results, setResults] = useState<Recommendation[] | null>(null);
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
          throw new Error('잠시 후 다시 시도해 주세요 (요청이 많습니다)');
        }
        if (!res.ok) {
          throw new Error(`추천 API 실패 (${res.status})`);
        }
        const data: { recommendations: Recommendation[] } = await res.json();
        setResults(data.recommendations);
      } catch (e) {
        setError(e instanceof Error ? e.message : '알 수 없는 오류');
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
            alt="해질 무렵 한적한 충남 근교 길"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/5 to-[var(--scrim)]"
            aria-hidden
          />
          <div className="relative z-[2] max-w-[760px] p-7 text-white sm:p-12 lg:p-[60px]">
            <div className="eyebrow !text-white/80">충남 · 공주 · 천안 · 아산 · 서산</div>
            <h1 className="mt-4 text-[clamp(40px,6.4vw,82px)] font-bold leading-[1.02] tracking-[-0.035em]">
              퇴근 후,
              <br />
              가장{' '}
              <em className="font-serif font-light italic tracking-[-0.01em] text-[#ffd9c6]">
                한적한
              </em>{' '}
              길로.
            </h1>
            <p className="mt-5 max-w-[540px] text-[clamp(15px,1.6vw,18px)] leading-[1.6] text-white/85">
              시간 슬라이더 하나면 충분해요. 데이터로 검증한 한적도와 펫 동반 코스 3곳을, 퇴근 5초
              안에.
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
