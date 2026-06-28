import { EmptyResult } from './empty-result';
import { RecommendCard } from './recommend-card';
import { RecommendSkeleton } from './recommend-skeleton';
import type { Recommendation } from '@/lib/types/recommendation';

// 추천 결과 영역 — 에디토리얼 헤딩 + 로딩/빈/카드 리스트 분기 (DESIGN_SYSTEM §9.1)
// 관심사: 결과 상태 표시. 데이터 fetching·zod 검증은 페이지/RecommendForm.

function formatHHmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

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
          <div className="eyebrow">오늘의 추천</div>
          <h2 className="mt-2.5 text-[clamp(26px,3.4vw,38px)] font-bold leading-[1.1] tracking-[-0.03em] text-ink">
            <b className="font-bold text-brand-ink">{timeHours}시간</b> 안에 다녀올 수 있는
            <br />
            가장 한적한 곳
          </h2>
        </div>
        <div className="flex-shrink-0 text-right text-[13px] text-muted">
          <span className="fig block text-[22px] text-ink">{String(count).padStart(2, '0')}</span>곳
          · {formatHHmm()} 기준
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
