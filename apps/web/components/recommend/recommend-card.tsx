import Link from 'next/link';
import { ArrowUpRight, Bookmark, Navigation, TrendingUp } from 'lucide-react';
import type { Recommendation } from '@/lib/types/recommendation';

// 추천 결과 — 사진-좌 / 본문-우 매거진 카드 (DESIGN_SYSTEM §9.1)
// 랭킹 뱃지 · 세리프 누메랄 스탯 행(한적도·거리·검증) · 30일 예측 라인 · 잉크 길찾기.
// 호버 시 리프트 + 사진 줌.

const RANK = ['01', '02', '03', '04', '05'] as const;

export function RecommendCard({ rec, rank }: { rec: Recommendation; rank: number }) {
  const { reason } = rec;
  const forecastUp = reason.quietnessForecast > reason.quietnessNow;
  const kakaoUrl = `https://map.kakao.com/link/to/${encodeURIComponent(rec.name)},${rec.lat},${rec.lng}`;

  return (
    <article className="group mb-[22px] grid grid-cols-1 overflow-hidden rounded-card border border-line bg-surface transition duration-300 ease-ds hover:-translate-y-[3px] hover:shadow-lift sm:grid-cols-[340px_1fr]">
      {/* ── 사진 ── */}
      <div className="relative min-h-[200px] overflow-hidden sm:min-h-[248px]">
        {rec.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rec.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-ds group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-2" aria-hidden />
        )}
        <span className="absolute left-4 top-4 z-[2] inline-flex items-center gap-[7px] rounded-full bg-white/90 px-3 py-1.5 pl-2.5 text-[#1d1813] backdrop-blur-sm">
          <span className="fig text-[15px] font-medium">{RANK[rank] ?? rank + 1}</span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8a7f6f]">
            한적
          </span>
        </span>
        <button
          type="button"
          aria-label="저장"
          className="absolute right-3.5 top-3.5 z-[2] grid h-[38px] w-[38px] place-items-center rounded-full bg-white/90 text-[#1d1813] backdrop-blur-sm transition hover:scale-105 hover:bg-white"
        >
          <Bookmark className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* ── 본문 ── */}
      <div className="flex flex-col p-6 sm:p-8">
        <Link
          href={`/poi/${rec.poiId}`}
          className="text-[clamp(19px,2vw,23px)] font-bold tracking-[-0.02em] text-ink hover:underline"
        >
          {rec.name}
        </Link>
        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted">
          {rec.address}
          <span className="h-[3px] w-[3px] rounded-full bg-faint" aria-hidden />
          {rec.sourceLabel}
        </div>

        {/* 스탯 행 — 세리프 누메랄 */}
        <div className="mt-[22px] flex border-y border-line-soft py-5">
          <div className="flex flex-1 flex-col gap-1 pr-4">
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
              <span className="h-[7px] w-[7px] rounded-full bg-quiet" aria-hidden /> 한적도
            </span>
            <span className="flex items-baseline gap-1 text-ink">
              <span className="fig text-[30px] leading-none">
                {rec.sampleSufficient ? reason.quietnessNow : '—'}
              </span>
              <span className="text-[12px] text-muted">
                {rec.sampleSufficient ? '/100' : '표본 부족'}
              </span>
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1 border-l border-line-soft pl-5 pr-4">
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
              <Navigation className="h-[11px] w-[11px]" aria-hidden /> 거리
            </span>
            <span className="flex items-baseline gap-1 text-ink">
              <span className="fig text-[30px] leading-none">{reason.distanceKm}</span>
              <span className="text-[12px] text-muted">km · {reason.etaMin}분</span>
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1 border-l border-line-soft pl-5">
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
              <span className="h-[7px] w-[7px] rounded-full bg-verify" aria-hidden /> 검증
            </span>
            <span className="flex items-baseline gap-1 text-ink">
              <span className="fig text-[30px] leading-none">{reason.verifiedCount}</span>
              <span className="text-[12px] text-muted">명 방문</span>
            </span>
          </div>
        </div>

        {/* 30일 예측 라인 */}
        {rec.sampleSufficient && (
          <div className="mt-4 flex items-center gap-[7px] text-[13px] text-forecast">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            내일 같은 시간 <span className="fig font-medium">{reason.quietnessForecast}</span>
            {forecastUp && <span aria-hidden>↑</span>}· 이번 주 평균{' '}
            <span className="fig font-medium">{reason.quietnessWeekAvg}</span>
          </div>
        )}

        {/* 액션 */}
        <div className="mt-auto flex items-center gap-2.5 pt-5">
          <a
            href={kakaoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-[7px] rounded-full border border-ink bg-transparent px-5 py-[11px] text-[13.5px] font-semibold text-ink transition duration-200 ease-ds hover:bg-ink hover:text-page"
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden /> 카카오 길찾기
          </a>
          <Link
            href={`/poi/${rec.poiId}`}
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-ink"
          >
            상세 보기 <ArrowUpRight className="h-[13px] w-[13px]" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
