// 추천 결과 로딩 스켈레톤 — 매거진 카드 3개분 placeholder
// 정적 JSX (no props, no state) — RSC 호환

export function RecommendSkeleton() {
  return (
    <div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="mb-[22px] grid grid-cols-1 overflow-hidden rounded-card border border-line bg-surface sm:grid-cols-[340px_1fr]"
        >
          <div className="min-h-[200px] animate-pulse bg-surface-2 sm:min-h-[248px]" />
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            <div className="h-5 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
            <div className="flex gap-5 border-y border-line-soft py-5">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex flex-1 flex-col gap-2">
                  <div className="h-2.5 w-12 animate-pulse rounded bg-surface-2" />
                  <div className="h-7 w-16 animate-pulse rounded bg-surface-2" />
                </div>
              ))}
            </div>
            <div className="h-9 w-36 animate-pulse rounded-full bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
