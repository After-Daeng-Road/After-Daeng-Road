// 추천 결과 로딩 스켈레톤 — RecommendCard 3개분 placeholder
// 정적 JSX (no props, no state) — RSC 호환

export function RecommendSkeleton() {
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
