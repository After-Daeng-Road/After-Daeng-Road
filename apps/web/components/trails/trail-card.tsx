'use client';

// 두루누비 산책로 카드 — 정보 면 + [미리보기] 를 누르면 같은 카드 박스 안에 경로 면이 덮인다.
// 모달·배경 스크림 없음. 카드 자체가 relative 이고 경로 면은 absolute inset-0 라
// 크기·라운드·보더가 카드와 정확히 같다. 닫으면 정보 면으로 돌아온다.
//
// 경로 데이터는 DB(durunubi_courses.path_geojson) 좌표를 그대로 잇는다. 카카오 링크(link/to)는
// 점 하나만 받아 경로를 못 그리므로 길찾기는 그대로 두고, 경로 확인은 이 면이 맡는다.
// NEXT_PUBLIC_KAKAO_JS_KEY 가 있으면 카카오맵 + Polyline, 없으면 좌표만 이어 그린 SVG 스케치.

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Clock3, Mountain, Navigation, Route, X } from 'lucide-react';
import { COPY } from '@/lib/copy';
import { kakaoDirectionsUrl } from '@/lib/format';
import { RouteSketch } from './route-sketch';

// 지도 SDK 래퍼는 미리보기를 열 때만 받는다 — 목록 초기 번들에서 제외
const KakaoRouteMap = dynamic(() => import('./kakao-route-map').then((m) => m.KakaoRouteMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-field bg-surface-2" />,
});

const T = COPY.trails;
const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '';

// 난이도 1~3 — 한적도 뱃지와 같은 신호등 색 체계
const DIFFICULTY_DOT = ['bg-[#16c750]', 'bg-[#ffc400]', 'bg-[#ff3b30]'];

export type TrailCardProps = {
  name: string;
  themeName: string | null;
  sigunText: string | null;
  description: string | null;
  distanceKm: number;
  elevationM: number | null;
  estimatedMin: number | null;
  /** 1~3 */
  level: number;
  /** 코스 시작점 (카카오 길찾기 목적지). 없으면 길찾기 버튼 생략 */
  start: { name: string; lat: number; lng: number } | null;
  /** [lng, lat][] — 2점 미만이면 미리보기 버튼 생략 */
  points: [number, number][];
};

export function TrailCard({
  name,
  themeName,
  sigunText,
  description,
  distanceKm,
  elevationM,
  estimatedMin,
  level,
  start,
  points,
}: TrailCardProps) {
  const [preview, setPreview] = useState(false);
  const hasRoute = points.length >= 2;

  // 경로 면이 열린 동안 Esc 로 닫기
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  return (
    <article className="relative flex flex-col overflow-hidden rounded-card border border-line bg-surface p-6 transition duration-300 ease-ds hover:-translate-y-[2px] hover:shadow-lift">
      {/* ── 정보 면 — 경로 면이 열려도 레이아웃(카드 높이)을 유지하려고 그대로 둔다 ── */}
      <div aria-hidden={preview || undefined} className={preview ? 'invisible' : undefined}>
        <div className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.04em] text-muted">
          <Route className="h-3.5 w-3.5 text-brand" aria-hidden />
          {themeName}
          {sigunText && (
            <>
              <span className="text-faint" aria-hidden>
                ·
              </span>
              {sigunText}
            </>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-bold tracking-[-0.02em] text-ink">{name}</h2>
          <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-body">
            <span className={`h-2 w-2 rounded-full ${DIFFICULTY_DOT[level - 1]}`} aria-hidden />
            {T.difficulty[level - 1]}
          </span>
        </div>

        {/* 설명은 항상 두 줄 높이를 차지한다 — 한 줄이거나 비어 있어도 아래 거리·소요 표가
            모든 카드에서 같은 위치에 오게. 13px × leading-relaxed(1.625) × 2줄 ≈ 42.25px */}
        <p className="mt-2 line-clamp-2 min-h-[42.25px] text-[13px] leading-relaxed text-muted">
          {description}
        </p>

        <div className="mt-4 flex border-y border-line-soft py-3.5 text-[12px] text-muted">
          <div className="flex-1">
            <div className="text-[10.5px] font-semibold tracking-[0.08em]">{T.distance}</div>
            <div className="mt-0.5 text-ink">
              <span className="fig text-[19px]">{distanceKm}</span> {T.kmUnit}
            </div>
          </div>
          <div className="flex-1 border-l border-line-soft pl-4">
            <div className="flex items-center gap-1 text-[10.5px] font-semibold tracking-[0.08em]">
              <Clock3 className="h-3 w-3" aria-hidden /> {T.duration}
            </div>
            <div className="mt-0.5 text-ink">{T.hourMin(estimatedMin ?? 0)}</div>
          </div>
          {elevationM != null && (
            <div className="flex-1 border-l border-line-soft pl-4">
              <div className="flex items-center gap-1 text-[10.5px] font-semibold tracking-[0.08em]">
                <Mountain className="h-3 w-3" aria-hidden /> {T.elevation}
              </div>
              <div className="mt-0.5 text-ink">
                <span className="fig text-[19px]">{elevationM}</span> {T.mUnit}
              </div>
            </div>
          )}
        </div>

        {/* [미리보기] 경로 선 · [카카오 길찾기] 시작점까지 */}
        <div className="mt-4 flex flex-wrap gap-2">
          {hasRoute && (
            <button
              type="button"
              onClick={() => setPreview(true)}
              tabIndex={preview ? -1 : undefined}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface-2 px-4 py-2 text-[12.5px] font-semibold text-body transition duration-200 ease-ds hover:border-faint hover:text-ink"
            >
              <Route className="h-3.5 w-3.5" aria-hidden /> {T.preview}
            </button>
          )}
          {start && (
            <a
              href={kakaoDirectionsUrl(start.name, start.lat, start.lng)}
              target="_blank"
              rel="noreferrer"
              tabIndex={preview ? -1 : undefined}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ink bg-transparent px-4 py-2 text-[12.5px] font-semibold text-ink transition duration-200 ease-ds hover:bg-ink hover:text-page"
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden /> {T.kakao}
            </a>
          )}
        </div>
      </div>

      {/* ── 경로 면 — 카드와 같은 박스(absolute inset-0, 같은 패딩) ── */}
      {preview && hasRoute && (
        <div
          role="region"
          aria-label={T.previewAria(name)}
          className="absolute inset-0 flex flex-col bg-surface p-6"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold tracking-[-0.02em] text-ink">{name}</h3>
              <p className="mt-0.5 text-[11.5px] text-muted">
                <span className="fig">{distanceKm}</span>
                {T.kmUnit}
                {estimatedMin != null && <> · {T.hourMin(estimatedMin)}</>}
                {' · '}
                {T.pointCount(points.length)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreview(false)}
              aria-label={T.previewClose}
              autoFocus
              className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* 남은 높이를 지도/스케치가 채운다 */}
          <div className="min-h-0 flex-1">
            {KAKAO_JS_KEY ? (
              <KakaoRouteMap appKey={KAKAO_JS_KEY} points={points} />
            ) : (
              <RouteSketch points={points} />
            )}
          </div>
          {!KAKAO_JS_KEY && <p className="mt-2 text-[11px] text-faint">{T.previewNoKey}</p>}
        </div>
      )}
    </article>
  );
}
