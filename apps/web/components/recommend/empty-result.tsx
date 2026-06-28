import { Search } from 'lucide-react';

// 추천 결과 빈상태 — 시간 +1시간 늘려서 재시도 CTA (DESIGN_SYSTEM §5 EmptyState)
// 솔직한 빈 상태 카피 + 완화 액션.

export function EmptyResult({ onRelax }: { onRelax: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface p-10 text-center">
      <Search className="mx-auto h-8 w-8 text-faint" aria-hidden />
      <div className="mt-3 text-[15px] font-semibold text-ink">
        조건에 맞는 한적한 곳을 찾지 못했어요
      </div>
      <p className="mt-1.5 text-[13px] text-muted">시간을 늘리거나 다른 출발지로 시도해 보세요</p>
      <button
        type="button"
        onClick={onRelax}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-page transition-opacity duration-200 ease-ds hover:opacity-85"
      >
        시간 +1시간 늘려서 다시
      </button>
    </div>
  );
}
