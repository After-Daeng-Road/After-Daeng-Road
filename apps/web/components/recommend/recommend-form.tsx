'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Clock, Dog, MapPin } from 'lucide-react';
import { COPY } from '@/lib/copy';
import { CHUNGNAM_SEED, TIME_MAX, TIME_MIN, TIME_STEP } from '@/lib/constants';
import { formatHHmm, radiusFromHours } from '@/lib/format';
import type { Pet, RecommendInput } from '@/lib/types/recommendation';

// 댕로드 검색 콘솔 — 시간슬라이더 · 출발지 · 펫 · 출발시각 · 제출 (DESIGN_SYSTEM §9.1)
// 시그니처 TimeSlider: 세리프 누메랄 값 + "{n}시간 · 반경 약 {km}km" 라이브 캡션.
// timeHours 만 controlled (부모가 EmptyResult.onRelax 등으로 외부 조작),
// 나머지(departure, selectedPetId, startAt)는 내부 상태.

const C = COPY.home.console;

// 출발 시각 옵션: 지금 + 30분 단위 +6h 미래
const START_AT_OPTIONS = (() => {
  const opts: { value: string; label: string }[] = [
    { value: 'now', label: C.startNow(formatHHmm(new Date())) },
  ];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(Date.now() + i * 30 * 60 * 1000);
    opts.push({ value: d.toISOString(), label: C.startPlus(i * 30, formatHHmm(d)) });
  }
  return opts;
})();

const TICKS = [1, 2, 3, 4, 5, 6];

export function RecommendForm({
  pets,
  timeHours,
  onTimeHoursChange,
  loading,
  onSubmit,
}: {
  pets: Pet[];
  timeHours: number;
  onTimeHoursChange: (v: number) => void;
  loading: boolean;
  onSubmit: (input: RecommendInput) => void;
}) {
  const [departure, setDeparture] = useState(CHUNGNAM_SEED.CHEONAN);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id ?? null);
  const [startAt, setStartAt] = useState<string>('now');

  const radiusKm = radiusFromHours(timeHours);
  const canRecommend = selectedPetId !== null && !loading;
  // 슬라이더 채움 비율 (브랜드 → 라인)
  const pct = ((timeHours - TIME_MIN) / (TIME_MAX - TIME_MIN)) * 100;

  const handleSubmit = () => {
    onSubmit({
      petId: selectedPetId,
      timeHours,
      startAt: startAt === 'now' ? new Date().toISOString() : startAt,
      departure: { lat: departure.lat, lng: departure.lng, label: departure.label },
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) =>
      setDeparture({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: C.currentLocation,
      }),
    );
  };

  const selectCls =
    'h-[50px] w-full cursor-pointer appearance-none rounded-field border border-line bg-surface-2 pl-[15px] pr-9 text-[14.5px] font-medium text-body transition-colors hover:border-faint focus:border-brand focus:outline-none';

  return (
    <section className="rounded-card border border-line bg-surface p-6 shadow-lift sm:p-8">
      {/* ── 시간 슬라이더 ── */}
      <div className="min-w-[280px]">
        <div className="mb-3.5 flex items-baseline justify-between">
          <span className="text-[12.5px] font-semibold tracking-[0.02em] text-muted">
            {C.timeLabel}
          </span>
          <span className="text-ink">
            <span className="fig text-[30px]">{timeHours}</span>
            <span className="ml-0.5 text-[13px] text-muted">{C.hourUnit}</span>
          </span>
        </div>
        <input
          type="range"
          min={TIME_MIN}
          max={TIME_MAX}
          step={TIME_STEP}
          value={timeHours}
          onChange={(e) => onTimeHoursChange(Number(e.target.value))}
          className="ds-slider"
          style={{
            background: `linear-gradient(to right, var(--accent) ${pct}%, var(--line) ${pct}%)`,
          }}
          aria-label={C.timeLabel}
        />
        <div className="mt-2.5 flex justify-between text-[11px] text-faint">
          {TICKS.map((h) => (
            <span key={h} className={h === Math.round(timeHours) ? 'font-bold text-brand-ink' : ''}>
              {h}h
            </span>
          ))}
        </div>
        <div className="mt-3 text-[13px] text-muted">
          {C.radiusPre}
          <b className="font-semibold text-ink">{radiusKm}</b>
          {C.radiusPost}
        </div>
      </div>

      {/* ── 필드 그리드 ── */}
      <div className="mt-6 grid grid-cols-2 items-end gap-3 border-t border-line-soft pt-6 md:grid-cols-[1.2fr_1fr_1fr_auto]">
        {/* 출발지 */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.02em] text-muted">
            <MapPin className="h-[13px] w-[13px]" aria-hidden /> {C.departure}
          </label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <select
                value={departure.label}
                onChange={(e) => {
                  const next = Object.values(CHUNGNAM_SEED).find((c) => c.label === e.target.value);
                  if (next) setDeparture(next);
                }}
                className={selectCls}
              >
                {Object.values(CHUNGNAM_SEED).map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.label}
                    {C.citySuffix}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
            </div>
            <button
              type="button"
              onClick={useCurrentLocation}
              className="h-[50px] rounded-field border border-line bg-surface-2 px-3 text-xs font-medium text-body transition-colors hover:border-faint"
            >
              {C.currentLocation}
            </button>
          </div>
        </div>

        {/* 반려견 */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.02em] text-muted">
            <Dog className="h-[13px] w-[13px]" aria-hidden /> {C.pet}
          </label>
          {pets.length === 0 ? (
            <Link
              href="/me/pets/new"
              className="flex h-[50px] items-center justify-center rounded-field border border-dashed border-line bg-surface-2 px-3 text-center text-xs font-medium text-brand-ink hover:bg-brand-soft"
            >
              {C.registerPet}
            </Link>
          ) : (
            <div className="relative">
              <select
                value={selectedPetId ?? ''}
                onChange={(e) => setSelectedPetId(e.target.value)}
                className={selectCls}
              >
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.breed} · {p.weightKg}kg
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
            </div>
          )}
        </div>

        {/* 출발 시각 */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.02em] text-muted">
            <Clock className="h-[13px] w-[13px]" aria-hidden /> {C.startAt}
          </label>
          <div className="relative">
            <select
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={selectCls}
            >
              {START_AT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
          </div>
        </div>

        {/* 제출 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canRecommend}
          className="col-span-2 inline-flex h-[50px] items-center justify-center gap-2 whitespace-nowrap rounded-field bg-brand px-[26px] text-[14.5px] font-bold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition duration-200 ease-ds hover:translate-y-[-1px] hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none dark:text-[#20160f] md:col-span-1"
        >
          {loading ? (
            C.submitting
          ) : (
            <>
              {C.submit} <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </div>

      {!selectedPetId && pets.length === 0 && (
        <p className="mt-3 text-center text-[11px] text-muted">{C.needPet}</p>
      )}
    </section>
  );
}
