'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Clock, Dog, MapPin } from 'lucide-react';
import type { Pet, RecommendInput } from '@/lib/types/recommendation';

// 댕로드 메인 추천 폼 — 시간슬라이더 · 출발지 · 펫 · 출발시각 · 제출 버튼
// 관심사: 입력값 수집 + onSubmit 으로 부모에 RecommendInput 전달
// timeHours 만 controlled (부모가 EmptyResult.onRelax 등으로 외부 조작 가능),
// 나머지 (departure, selectedPetId, startAt) 는 내부 상태.

const TIME_MIN = 1;
const TIME_MAX = 6;
const TIME_STEP = 0.5;

// 충남 4시 시드 좌표 (PRD §13.3)
const CHUNGNAM_SEED: Record<string, { lat: number; lng: number; label: string }> = {
  GONGJU: { lat: 36.4467, lng: 127.119, label: '공주' },
  CHEONAN: { lat: 36.8151, lng: 127.1135, label: '천안' },
  ASAN: { lat: 36.7898, lng: 127.0019, label: '아산' },
  SEOSAN: { lat: 36.7848, lng: 126.4503, label: '서산' },
};

function formatHHmm(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

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

  const radiusKm = Math.round((timeHours / 2) * 50);
  const canRecommend = selectedPetId !== null && !loading;

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
        label: '현 위치',
      }),
    );
  };

  return (
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
            onChange={(e) => onTimeHoursChange(Number(e.target.value))}
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
                  const next = Object.values(CHUNGNAM_SEED).find((c) => c.label === e.target.value);
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
              onClick={useCurrentLocation}
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
          onClick={handleSubmit}
          disabled={!canRecommend}
          className="mt-5 w-full rounded bg-[#f56500] py-3 text-sm font-bold text-white transition hover:bg-[#e65a00] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {loading ? (
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
  );
}
