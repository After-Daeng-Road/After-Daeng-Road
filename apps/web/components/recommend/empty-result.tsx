import { Search } from 'lucide-react';
import { COPY } from '@/lib/copy';

// 추천 결과 빈상태 — 시간 +1시간 늘려서 재시도 CTA (DESIGN_SYSTEM §5 EmptyState)
// 솔직한 빈 상태 카피 + 완화 액션.

const E = COPY.home.empty;

export function EmptyResult({ onRelax }: { onRelax: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface p-10 text-center">
      <Search className="mx-auto h-8 w-8 text-faint" aria-hidden />
      <div className="mt-3 text-[15px] font-semibold text-ink">{E.title}</div>
      <p className="mt-1.5 text-[13px] text-muted">{E.desc}</p>
      <button
        type="button"
        onClick={onRelax}
        className="btn-ink mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-[13.5px]"
      >
        {E.relax}
      </button>
    </div>
  );
}
