// PRD §9 비기능: LCP ≤ 2.5s — 즉시 표시되는 스켈레톤
export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded bg-surface-2" />
        <div className="h-32 animate-pulse rounded-card bg-surface-2" />
        <div className="h-32 animate-pulse rounded-card bg-surface-2" />
      </div>
    </main>
  );
}
