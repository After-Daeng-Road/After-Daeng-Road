import { EmptyResult } from './empty-result';
import { RecommendCard } from './recommend-card';
import { RecommendSkeleton } from './recommend-skeleton';
import type { Recommendation } from '@/lib/types/recommendation';

// 추천 결과 영역 — 로딩/빈/카드 리스트 분기
// 관심사: 결과 상태 표시. 데이터 fetching·zod 검증은 페이지/RecommendForm.

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

  return (
    <section className="mt-6">
      <h2 className="mb-3 font-semibold">
        {timeHours}시간 안에 다녀올 수 있는 한적한 곳 {results?.length ?? 3}
      </h2>

      {loading && <RecommendSkeleton />}

      {!loading && results !== null && results.length === 0 && <EmptyResult onRelax={onRelax} />}

      {!loading && results !== null && results.length > 0 && (
        <div className="space-y-3">
          {results.map((rec) => (
            <RecommendCard key={rec.poiId} rec={rec} />
          ))}
        </div>
      )}
    </section>
  );
}
