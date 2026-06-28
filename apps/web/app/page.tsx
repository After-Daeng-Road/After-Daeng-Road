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

// 초기 데모 추천 3곳 (ui_kits 홈 기준) — 실제 "지금 추천받기" 응답이 오면 교체됨.
// 실데이터 연동 시 이 상수를 제거하고 초기값을 null 로 되돌리면 됨.
const SAMPLE_RESULTS: Recommendation[] = [
  {
    poiId: 'sample-seosan-haemi',
    name: '서산 해미읍성 둘레길',
    address: '충남 서산시 해미면',
    lat: 36.7028,
    lng: 126.5519,
    sourceLabel: '두루누비 코스',
    type: 'TRAIL',
    imageUrl: '/images/ref/poi-1.jpg',
    badges: ['TRAIL_OFFICIAL'],
    sampleSufficient: true,
    reason: {
      distanceKm: 42,
      etaMin: 48,
      quietnessNow: 87,
      quietnessForecast: 92,
      quietnessWeekAvg: 89,
      verifiedCount: 5,
    },
  },
  {
    poiId: 'sample-asan-sinjeong',
    name: '아산 신정호 호수 산책로',
    address: '충남 아산시',
    lat: 36.7757,
    lng: 127.0376,
    sourceLabel: '두루누비 코스',
    type: 'TRAIL',
    imageUrl: '/images/ref/poi-2.jpg',
    badges: ['TRAIL_OFFICIAL'],
    sampleSufficient: true,
    reason: {
      distanceKm: 28,
      etaMin: 32,
      quietnessNow: 79,
      quietnessForecast: 83,
      quietnessWeekAvg: 81,
      verifiedCount: 8,
    },
  },
  {
    poiId: 'sample-gongju-muryeong',
    name: '공주 무령왕릉 인근 야외 카페',
    address: '충남 공주시',
    lat: 36.4609,
    lng: 127.1145,
    sourceLabel: '펫동반 가능',
    type: 'CAFE',
    imageUrl: '/images/ref/poi-3.jpg',
    badges: ['PET_VERIFIED'],
    sampleSufficient: true,
    reason: {
      distanceKm: 55,
      etaMin: 60,
      quietnessNow: 91,
      quietnessForecast: 90,
      quietnessWeekAvg: 88,
      verifiedCount: 3,
    },
  },
];

// ───────── 페이지 ─────────

export default function HomePage() {
  // 폼 상태 — timeHours 만 EmptyResult.onRelax 에서 외부 조작 위해 페이지에 잔류
  const [timeHours, setTimeHours] = useState(TIME_DEFAULT);
  const [pets] = useState<Pet[]>([
    { id: 'p1', name: '다람이', breed: '푸들', weightKg: 5, ageYears: 3 }, // 데모용 (실제: GET /api/pets)
  ]);

  // 결과 상태 — 초기엔 데모 추천 표시, 실제 검색 응답이 오면 교체
  const [results, setResults] = useState<Recommendation[] | null>(SAMPLE_RESULTS);
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
