'use client';

// 댕로드 — 3.1 메인 화면 (시간슬라이더 · 추천 결과 · 알림 CTA)
// 참조: daengroad_ui_spec_3.1_main_v0.1.html v0.1 / PRD v1.0.5 §6, §8, §12

import { useState, useTransition } from 'react';
import { z } from 'zod';

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

type ReasonChip = {
  distanceKm: number;
  etaMin: number;
  quietnessNow: number;
  quietnessForecast: number; // 내일 같은 시간
  quietnessWeekAvg: number; // 이번 주 평균
  verifiedCount: number;
};

type Recommendation = {
  poiId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  sourceLabel: '두루누비 코스' | '펫동반 가능' | 'TourAPI';
  type: 'CAFE' | 'RESTAURANT' | 'TRAIL' | 'PARK' | 'ATTRACTION';
  imageUrl: string | null;
  badges: Array<'PET_VERIFIED' | 'WELLNESS' | 'ECO' | 'TRAIL_OFFICIAL'>;
  reason: ReasonChip;
  sampleSufficient: boolean;
};

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
    <div className="min-h-screen bg-[#f4f4f6]">
      {/* ═════ 헤더 ═════ */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="text-lg font-bold text-[#f56500]">🐕 댕로드</div>
          <nav className="hidden items-center gap-4 text-sm text-gray-600 sm:flex">
            <a href="/" className="hover:text-gray-900">
              홈
            </a>
            <a href="/recommendations" className="hover:text-gray-900">
              추천
            </a>
            <a href="/me" className="hover:text-gray-900">
              마이페이지
            </a>
            <span className="text-gray-300">|</span>
            <button type="button" className="font-semibold hover:text-gray-900">
              로그인
            </button>
          </nav>
          <button type="button" className="text-xl sm:hidden" aria-label="메뉴">
            ≡
          </button>
        </div>
      </header>

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
              <label className="mb-1.5 block text-xs font-medium text-gray-700">📍 출발지</label>
              <div className="flex gap-1.5">
                <select
                  value={departure.label}
                  onChange={(e) => {
                    const next = Object.values(CHUNGNAM_SEED).find(
                      (c) => c.label === e.target.value,
                    );
                    if (next) setDeparture(next);
                  }}
                  className="flex-1 rounded border border-gray-300 bg-white px-3 py-2.5 text-sm"
                >
                  {Object.values(CHUNGNAM_SEED).map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label} (충남)
                    </option>
                  ))}
                </select>
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
              <label className="mb-1.5 block text-xs font-medium text-gray-700">🐶 펫</label>
              {pets.length === 0 ? (
                <a
                  href="/me/pets/new"
                  className="block rounded border border-dashed border-gray-300 bg-white px-3 py-2.5 text-center text-xs text-[#f56500] hover:bg-[#fff5f0]"
                >
                  펫 등록하기 →
                </a>
              ) : (
                <select
                  value={selectedPetId ?? ''}
                  onChange={(e) => setSelectedPetId(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-sm"
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.breed} · {p.weightKg}kg · {p.ageYears}살)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 1-4 출발 시각 */}
            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-medium text-gray-700">📅 출발 시각</label>
              <select
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2.5 text-sm"
              >
                {START_AT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 1-5 추천받기 버튼 */}
            <button
              type="button"
              onClick={handleRecommend}
              disabled={!canRecommend}
              className="mt-5 w-full rounded bg-[#f56500] py-3 text-sm font-bold text-white transition hover:bg-[#e65a00] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isPending ? '추천 계산 중…' : '지금 추천받기 →'}
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
                <div className="text-sm font-bold">
                  📧 매일 18시 한적도 추천을 메일로 받아볼래요?
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
          className="fixed bottom-5 right-5 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-[#f56500] text-[11px] font-bold text-white shadow-lg hover:bg-[#e65a00]"
          aria-label="검증 배지 안내"
        >
          검증
          <br />
          배지
        </button>
      )}
    </div>
  );
}

// ───────── 카드 ─────────

function RecommendCard({ rec }: { rec: Recommendation }) {
  const { reason } = rec;
  const forecastUp = reason.quietnessForecast > reason.quietnessNow;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        {/* 2-1 썸네일 */}
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-200" aria-hidden>
          {rec.imageUrl && (
            <img src={rec.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <a href={`/poi/${rec.poiId}`} className="block text-sm font-bold hover:underline">
            {rec.name}
          </a>
          <div className="mt-0.5 truncate text-[11px] text-gray-500">
            {rec.address} · {rec.sourceLabel}
          </div>

          {/* 2-2 3줄 근거 칩 */}
          <div className="mt-2 flex flex-wrap gap-1">
            <Chip>
              📍 {reason.distanceKm}km · {reason.etaMin}분
            </Chip>
            <Chip variant="green">
              🌿 한적도 {rec.sampleSufficient ? `${reason.quietnessNow}점` : '표본 부족'}
            </Chip>
            <Chip variant="pink">🐕 검증 배지 ({reason.verifiedCount}명)</Chip>
          </div>

          {/* 2-3 30일 예측 라벨 */}
          {rec.sampleSufficient && (
            <div className="mt-1.5 text-[11px] text-blue-600">
              📅 내일 같은 시간 <strong>{reason.quietnessForecast}점</strong>
              {forecastUp && <span className="ml-1">↑</span>}
              {' · '}
              이번 주 평균 {reason.quietnessWeekAvg}점
            </div>
          )}

          {/* 2-4 액션 버튼 */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <a
              href={`https://map.kakao.com/link/to/${encodeURIComponent(rec.name)},${rec.lat},${rec.lng}`}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-gray-700 px-3 py-1 text-[11px] font-bold text-white hover:bg-gray-800"
            >
              길찾기
            </a>
            <button
              type="button"
              className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] hover:bg-gray-200"
            >
              저장
            </button>
            <button
              type="button"
              className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] hover:bg-gray-200"
            >
              공유
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ───────── 보조 컴포넌트 ─────────

function Chip({
  children,
  variant = 'gray',
}: {
  children: React.ReactNode;
  variant?: 'gray' | 'green' | 'pink';
}) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    pink: 'bg-pink-100 text-pink-700',
  }[variant];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${colors}`}>
      {children}
    </span>
  );
}

function RecommendSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex gap-3">
            <div className="h-24 w-24 animate-pulse rounded-md bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="flex gap-1.5 pt-1">
                <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
                <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200" />
                <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onRelax }: { onRelax: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
      <div className="text-sm font-medium text-gray-700">조건에 맞는 한적한 곳을 찾지 못했어요</div>
      <p className="mt-1 text-xs text-gray-500">시간을 늘리거나 다른 출발지로 시도해 보세요</p>
      <button
        type="button"
        onClick={onRelax}
        className="mt-3 rounded bg-[#f56500] px-3 py-2 text-xs font-bold text-white hover:bg-[#e65a00]"
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
