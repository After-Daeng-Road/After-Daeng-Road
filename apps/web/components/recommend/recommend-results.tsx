import { COPY } from '@/lib/copy';
import { EmptyResult } from './empty-result';
import { NowLabel } from './now-label';
import { RecommendCard } from './recommend-card';
import { RecommendSkeleton } from './recommend-skeleton';
import type { Recommendation } from '@/lib/types/recommendation';

// 추천 결과 영역 — 에디토리얼 헤딩 + 로딩/빈/카드 리스트 분기 (DESIGN_SYSTEM §9.1)
// 관심사: 결과 상태 표시. 데이터 fetching·zod 검증은 페이지/RecommendForm.

const R = COPY.home.results;

export function RecommendResults({
  results,
  loading,
  timeHours,
  onRelax,
}: {
  results: Recommendation[] | null;
  loading: boolean;
  timeHours: number;
  onRelax: () => void;
}) {
  if (!loading && results === null) return null;

  const count = results?.length ?? 3;

  return (
    <section className="py-[clamp(56px,8vw,96px)]">
      <div className="mb-9 flex items-end justify-between gap-5">
        <div>
          <div className="eyebrow">{R.eyebrow}</div>
          <h2 className="mt-2.5 text-[clamp(26px,3.4vw,38px)] font-bold leading-[1.1] tracking-[-0.03em] text-ink">
            <b className="font-bold text-brand-ink">{R.headHours(timeHours)}</b>
            {R.headMid}
            <br />
            {R.head2}
          </h2>
        </div>
        <div className="flex-shrink-0 text-right text-[13px] text-muted">
          <span className="fig block text-[22px] text-ink">{String(count).padStart(2, '0')}</span>
          {R.placeUnit} · <NowLabel />
          {R.metaSuffix}
        </div>
      </div>

      {loading && <RecommendSkeleton />}

      {!loading && results !== null && results.length === 0 && <EmptyResult onRelax={onRelax} />}

      {!loading &&
        results !== null &&
        results.length > 0 &&
        results.map((rec, i) => <RecommendCard key={rec.poiId} rec={rec} rank={i} />)}
    </section>
  );
}
