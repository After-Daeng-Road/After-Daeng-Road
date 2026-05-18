'use client';

// 댕로드 — 3.1 메인 화면 (시간슬라이더 · 추천 결과 · 알림 CTA)
// 참조: daengroad_ui_spec_3.1_main_v0.1.html v0.1 / PRD v1.0.5 §6, §8, §12

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Clock,
  Dog,
  Mail,
  MapPin,
  Search,
} from 'lucide-react';
import { RecommendCard } from '@/components/recommend/recommend-card';
import { RecommendSkeleton } from '@/components/recommend/recommend-skeleton';
import type { Recommendation } from '@/lib/types/recommendation';

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

type RecommendInput = z.infer<typeof RecommendInputSchema>;

type Pet = {
  id: string;
  name: string;
  breed: string;
  weightKg: number;
  ageYears: number;
};

// ───────── 상수 ─────────

const TIME_MIN = 1;
const TIME_MAX = 6;
const TIME_STEP = 0.5;
const TIME_DEFAULT = 3;

// 충남 4시 시드 좌표 (PRD §13.3)
const CHUNGNAM_SEED: Record<string, { lat: number; lng: number; label: string }> = {
  GONGJU: { lat: 36.4467, lng: 127.119, label: '공주' },
  CHEONAN: { lat: 36.8151, lng: 127.1135, label: '천안' },
  ASAN: { lat: 36.7898, lng: 127.0019, label: '아산' },
  SEOSAN: { lat: 36.7848, lng: 126.4503, label: '서산' },
};

// 출발 시각 옵션: 지금 + 30분 단위 +6h 미래 (UI 1-4)
const START_AT_OPTIONS = (() => {
  const opts: { value: string; label: string }[] = [
    { value: 'now', label: `지금 (${formatHHmm(new Date())})` },
  ];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(Date.now() + i * 30 * 60 * 1000);
    opts.push({ value: d.toISOString(), label: `+${i * 30}분 (${formatHHmm(d)})` });
  }
  return opts;
})();

// ───────── 페이지 ─────────

export default function HomePage() {
  // 폼 상태
  const [timeHours, setTimeHours] = useState(TIME_DEFAULT);
  const [departure, setDeparture] = useState(CHUNGNAM_SEED.CHEONAN);
  const [pets] = useState<Pet[]>([
    { id: 'p1', name: '다람이', breed: '푸들', weightKg: 5, ageYears: 3 }, // 데모용 (실제: GET /api/pets)
  ]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id ?? null);
  const [startAt, setStartAt] = useState<string>('now');

  // 결과 상태
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 알림 / 플로팅 디스미스
  const [emailCtaDismissed, setEmailCtaDismissed] = useState(false);
  const [floatingDismissed, setFloatingDismissed] = useState(false);

  const radiusKm = Math.round((timeHours / 2) * 50);
  const canRecommend = selectedPetId !== null && !isPending;

  const handleRecommend = () => {
    setError(null);
    startTransition(async () => {
      try {
        const input: RecommendInput = {
          petId: selectedPetId,
          timeHours,
          startAt: startAt === 'now' ? new Date().toISOString() : startAt,
          departure: { lat: departure.lat, lng: departure.lng, label: departure.label },
        };
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
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <h1 className="text-center text-xl font-bold sm:text-2xl">오늘 어디 가지?</h1>
          <p className="mt-1.5 text-center text-xs text-gray-500 sm:text-sm">
            퇴근 후 한적한 펫 외출 코스를 5초 안에
          </p>

          <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-[#fafafa] p-4 sm:p-5">
            {/* 1-1 시간 슬라이더 */}
            <fieldset>
              <div className="mb-1.5 flex justify-between text-[11px] text-gray-500">
                {[1, 2, 3, 4, 5, 6].map((h) => (
                  <span
                    key={h}
                    className={h === Math.round(timeHours) ? 'font-bold text-[#f56500]' : ''}
                  >
                    {h}h
                  </span>
                ))}
              </div>
              <input
                type="range"
                min={TIME_MIN}
                max={TIME_MAX}
                step={TIME_STEP}
                value={timeHours}
                onChange={(e) => setTimeHours(Number(e.target.value))}
                className="w-full accent-[#f56500]"
                aria-label="외출 가능 시간"
              />
              <div className="mt-1 text-center text-xs text-gray-500">
                <strong className="text-[#f56500]">{timeHours}시간</strong> · 반경 약 {radiusKm}km
              </div>
            </fieldset>

            {/* 1-2 출발지 */}
            <div className="mt-4">
              <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-gray-700">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> 출발지
              </label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <select
                    value={departure.label}
                    onChange={(e) => {
                      const next = Object.values(CHUNGNAM_SEED).find(
                        (c) => c.label === e.target.value,
                      );
                      if (next) setDeparture(next);
                    }}
                    className="w-full appearance-none rounded border border-gray-300 bg-white py-2.5 pl-3 pr-8 text-sm"
                  >
                    {Object.values(CHUNGNAM_SEED).map((c) => (
                      <option key={c.label} value={c.label}>
                        {c.label} (충남)
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) return;
                    navigator.geolocation.getCurrentPosition((pos) =>
                      setDeparture({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        label: '현 위치',
                      }),
                    );
                  }}
                  className="rounded border border-gray-300 bg-white px-3 py-2.5 text-xs hover:bg-gray-50"
                >
                  현 위치
                </button>
              </div>
            </div>

            {/* 1-3 펫 선택 */}
            <div className="mt-3">
              <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-gray-700">
                <Dog className="h-3.5 w-3.5" aria-hidden /> 펫
              </label>
              {pets.length === 0 ? (
                <Link
                  href="/me/pets/new"
                  className="block rounded border border-dashed border-gray-300 bg-white px-3 py-2.5 text-center text-xs text-[#f56500] hover:bg-[#fff5f0]"
                >
                  펫 등록하기 →
                </Link>
              ) : (
                <div className="relative">
                  <select
                    value={selectedPetId ?? ''}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    className="w-full appearance-none rounded border border-gray-300 bg-white py-2.5 pl-3 pr-8 text-sm"
                  >
                    {pets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.breed} · {p.weightKg}kg · {p.ageYears}살)
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    aria-hidden
                  />
                </div>
              )}
            </div>

            {/* 1-4 출발 시각 */}
            <div className="mt-3">
              <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-gray-700">
                <Clock className="h-3.5 w-3.5" aria-hidden /> 출발 시각
              </label>
              <div className="relative">
                <select
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full appearance-none rounded border border-gray-300 bg-white py-2.5 pl-3 pr-8 text-sm"
                >
                  {START_AT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                  aria-hidden
                />
              </div>
            </div>

            {/* 1-5 추천받기 버튼 */}
            <button
              type="button"
              onClick={handleRecommend}
              disabled={!canRecommend}
              className="mt-5 w-full rounded bg-[#f56500] py-3 text-sm font-bold text-white transition hover:bg-[#e65a00] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isPending ? (
                '추천 계산 중…'
              ) : (
                <span className="inline-flex items-center justify-center gap-1.5">
                  지금 추천받기 <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              )}
            </button>
            {!selectedPetId && pets.length === 0 && (
              <p className="mt-2 text-center text-[11px] text-gray-500">
                펫 등록 후 추천을 받을 수 있어요
              </p>
            )}
          </div>
        </section>

        {/* ═════ 에러 토스트 ═════ */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-xs underline">
              닫기
            </button>
          </div>
        )}

        {/* ═════ 2. 추천 결과 영역 ═════ */}
        {(isPending || results !== null) && (
          <section className="mt-6">
            <h2 className="mb-3 font-semibold">
              {timeHours}시간 안에 다녀올 수 있는 한적한 곳 {results?.length ?? 3}
            </h2>

            {isPending && <RecommendSkeleton />}

            {!isPending && results !== null && results.length === 0 && (
              <EmptyState
                onRelax={() => {
                  setTimeHours(Math.min(TIME_MAX, timeHours + 1));
                }}
              />
            )}

            {!isPending && results !== null && results.length > 0 && (
              <div className="space-y-3">
                {results.map((rec) => (
                  <RecommendCard key={rec.poiId} rec={rec} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ═════ 3. 이메일 알림 CTA ═════ */}
        {!emailCtaDismissed && (
          <section className="mt-6 rounded-xl border border-yellow-200 bg-[#fff8e1] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  <Mail className="h-4 w-4 text-brand" aria-hidden /> 매일 18시 한적도 추천을 메일로
                  받아볼래요?
                </div>
                <div className="mt-1 text-[11px] text-gray-600">
                  시간·요일 자율 설정 · 1탭 수신거부
                </div>
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
                  onClick={() => setEmailCtaDismissed(true)}
                  className="text-[10px] text-gray-500 underline"
                >
                  나중에
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ═════ 4. 검증 배지 가이드 플로팅 ═════ */}
      {!floatingDismissed && (
        <button
          type="button"
          onClick={() => setFloatingDismissed(true)}
          className="fixed bottom-5 right-5 flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full bg-brand text-[10px] font-bold text-white shadow-lg hover:bg-brand-hover"
          aria-label="검증 배지 안내"
        >
          <BadgeCheck className="h-5 w-5" aria-hidden />
          검증 배지
        </button>
      )}
    </>
  );
}

// ───────── 보조 컴포넌트 ─────────

function EmptyState({ onRelax }: { onRelax: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
      <Search className="mx-auto h-8 w-8 text-gray-300" aria-hidden />
      <div className="mt-2 text-sm font-medium text-gray-700">
        조건에 맞는 한적한 곳을 찾지 못했어요
      </div>
      <p className="mt-1 text-xs text-gray-500">시간을 늘리거나 다른 출발지로 시도해 보세요</p>
      <button
        type="button"
        onClick={onRelax}
        className="mt-3 rounded bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-hover"
      >
        시간 +1시간 늘려서 다시
      </button>
    </div>
  );
}

// ───────── 유틸 ─────────

function formatHHmm(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
