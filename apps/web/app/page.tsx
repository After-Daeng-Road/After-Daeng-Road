'use client';

// 댕로드 — 3.1 메인 화면 (시간슬라이더 · 추천 결과 · 알림 CTA)
// 참조: daengroad_ui_spec_3.1_main_v0.1.html v0.1 / PRD v1.0.5 §6, §8, §12

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
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        {/* ═════ 1. 메인 검색 영역 ═════ */}
        <RecommendForm
          pets={pets}
          timeHours={timeHours}
          onTimeHoursChange={setTimeHours}
          loading={isPending}
          onSubmit={handleRecommend}
        />

        {/* ═════ 에러 배너 ═════ */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* ═════ 2. 추천 결과 영역 ═════ */}
        <RecommendResults
          results={results}
          loading={isPending}
          timeHours={timeHours}
          onRelax={() => setTimeHours(Math.min(TIME_MAX, timeHours + 1))}
        />

        {/* ═════ 3. 이메일 알림 CTA ═════ */}
        <EmailCta />
      </main>

      {/* ═════ 4. 검증 배지 가이드 플로팅 ═════ */}
      <FloatingBadgeGuide />
    </>
  );
}
