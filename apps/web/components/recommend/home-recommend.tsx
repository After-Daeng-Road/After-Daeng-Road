'use client';

// 댕로드 홈 인터랙티브 본문 — 히어로 · 시간슬라이더 콘솔 · 추천 결과 · 이메일 밴드
// pets 는 서버(page.tsx)에서 listPets() 로 조회해 주입 (하드코딩 데모 제거).

import { useEffect, useState, useTransition } from 'react';
import { z } from 'zod';
import { COPY } from '@/lib/copy';
import { TIME_DEFAULT, TIME_MAX } from '@/lib/constants';
import { ErrorBanner } from '@/components/ui/error-banner';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { EmailCta } from '@/components/recommend/email-cta';
import { FloatingBadgeGuide } from '@/components/recommend/floating-badge-guide';
import { RecommendForm } from '@/components/recommend/recommend-form';
import { RecommendResults } from '@/components/recommend/recommend-results';
import type {
  Pet,
  Recommendation,
  RecommendInput,
  RecommendResponse,
} from '@/lib/types/recommendation';

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

  // 결과 상태 — null 이면 RecommendResults 가 섹션 자체를 렌더하지 않는다.
  // (데모 추천을 초기값으로 두면 검색 전에 가짜 3곳이 실데이터처럼 보인다)
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [departure, setDeparture] = useState<RecommendInput['departure'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // 더보기(서버 페이지네이션) — hasMore 는 서버 응답, lastInput 은 첫 검색 조건.
  // 더보기 요청은 startAt·departure 를 첫 검색 값 그대로 재사용해야 순위가 흔들리지 않는다 (PR #30).
  const [hasMore, setHasMore] = useState(false);
  const [lastInput, setLastInput] = useState<RecommendInput | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // 상세보기 이동 후 뒤로 오면 홈이 언마운트→재마운트되며 결과가 사라지는 문제 해결.
  // 마지막 추천 결과·시간을 sessionStorage 에 유지했다가 복원한다 (SSR 하이드레이션 불일치 방지 위해 effect 에서).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('daeng:recommend');
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        results?: Recommendation[];
        timeHours?: number;
        departure?: RecommendInput['departure'];
        hasMore?: boolean;
        lastInput?: RecommendInput;
      };
      if (parsed.results) setResults(parsed.results);
      if (typeof parsed.timeHours === 'number') setTimeHours(parsed.timeHours);
      if (parsed.departure) setDeparture(parsed.departure);
      if (typeof parsed.hasMore === 'boolean') setHasMore(parsed.hasMore);
      if (parsed.lastInput) setLastInput(parsed.lastInput);
    } catch {
      /* 손상된 값이면 무시 */
    }
  }, []);

  const persist = (state: {
    results: Recommendation[];
    timeHours: number;
    departure: RecommendInput['departure'];
    hasMore: boolean;
    lastInput: RecommendInput;
  }) => {
    try {
      sessionStorage.setItem('daeng:recommend', JSON.stringify(state));
    } catch {
      /* 저장 실패는 치명적 아님 */
    }
  };

  const callRecommend = async (body: RecommendInput & { limit?: number; offset?: number }) => {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 429) throw new Error(COPY.home.errors.rateLimit);
    if (!res.ok) throw new Error(COPY.home.errors.apiFail(res.status));
    return (await res.json()) as RecommendResponse;
  };

  // 첫 검색 — limit 생략(서버 기본 3, PRD §6.1 "추천 3곳")
  const handleRecommend = (input: RecommendInput) => {
    setError(null);
    setDeparture(input.departure);
    startTransition(async () => {
      try {
        RecommendInputSchema.parse(input);
        const data = await callRecommend(input);
        setResults(data.recommendations);
        setHasMore(data.hasMore);
        setLastInput(input);
        persist({
          results: data.recommendations,
          timeHours: input.timeHours,
          departure: input.departure,
          hasMore: data.hasMore,
          lastInput: input,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : COPY.home.errors.unknown);
      }
    });
  };

  // 다음 페이지 10개 로드 — offset+limit ≤ 100 서버 제약이라 마지막 페이지는 잘라서 요청.
  // 성공 여부를 반환해 결과 영역이 페이지 이동을 확정할 수 있게 한다.
  const handleLoadMore = async (): Promise<boolean> => {
    if (!lastInput || !results || loadingMore) return false;
    const offset = results.length;
    const limit = Math.min(10, 100 - offset);
    if (limit <= 0) {
      setHasMore(false);
      return false;
    }
    setLoadingMore(true);
    setError(null);
    try {
      const data = await callRecommend({ ...lastInput, offset, limit });
      const merged = [...results, ...data.recommendations];
      const more = data.hasMore && offset + data.recommendations.length < 100;
      setResults(merged);
      setHasMore(more);
      persist({
        results: merged,
        timeHours: lastInput.timeHours,
        departure: lastInput.departure,
        hasMore: more,
        lastInput,
      });
      return data.recommendations.length > 0;
    } catch (e) {
      setError(e instanceof Error ? e.message : COPY.home.errors.unknown);
      return false;
    } finally {
      setLoadingMore(false);
    }
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
          departure={departure ?? undefined}
          onRelax={() => setTimeHours(Math.min(TIME_MAX, timeHours + 1))}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
        />

        {/* ═════ 이메일 밴드 ═════ */}
        <EmailCta />
      </main>

      {/* ═════ 검증 배지 가이드 플로팅 ═════ */}
      <FloatingBadgeGuide />

      {/* ═════ 전면 로딩 오버레이 — 추천 검색·페이지 로드 중 화면 정중앙 ═════ */}
      <LoadingOverlay show={isPending || loadingMore} />
    </>
  );
}
