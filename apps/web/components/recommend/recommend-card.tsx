import Link from 'next/link';
import { Bookmark, Calendar, Leaf, MapPin, Navigation, PawPrint, Share2 } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import type { Recommendation } from '@/lib/types/recommendation';

// 추천 카드 1개 — 썸네일·제목·메타·3줄 근거 칩·30일 예측·액션 (PRD §6.2, §7.1)

export function RecommendCard({ rec }: { rec: Recommendation }) {
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
          <Link href={`/poi/${rec.poiId}`} className="block text-sm font-bold hover:underline">
            {rec.name}
          </Link>
          <div className="mt-0.5 truncate text-[11px] text-gray-500">
            {rec.address} · {rec.sourceLabel}
          </div>

          {/* 2-2 3줄 근거 칩 */}
          <div className="mt-2 flex flex-wrap gap-1">
            <Chip icon={<MapPin className="h-3 w-3" />}>
              {reason.distanceKm}km · {reason.etaMin}분
            </Chip>
            <Chip variant="green" icon={<Leaf className="h-3 w-3" />}>
              한적도 {rec.sampleSufficient ? `${reason.quietnessNow}점` : '표본 부족'}
            </Chip>
            <Chip variant="pink" icon={<PawPrint className="h-3 w-3" />}>
              검증 배지 ({reason.verifiedCount}명)
            </Chip>
          </div>

          {/* 2-3 30일 예측 라벨 */}
          {rec.sampleSufficient && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-blue-600">
              <Calendar className="h-3 w-3" aria-hidden />
              내일 같은 시간 <strong>{reason.quietnessForecast}점</strong>
              {forecastUp && <span className="ml-0.5">↑</span>}
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
              className="inline-flex items-center gap-1 rounded bg-gray-700 px-3 py-1 text-[11px] font-bold text-white hover:bg-gray-800"
            >
              <Navigation className="h-3 w-3" aria-hidden /> 길찾기
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] hover:bg-gray-200"
            >
              <Bookmark className="h-3 w-3" aria-hidden /> 저장
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] hover:bg-gray-200"
            >
              <Share2 className="h-3 w-3" aria-hidden /> 공유
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
