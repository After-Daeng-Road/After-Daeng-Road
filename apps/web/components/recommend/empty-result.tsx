import { Search } from 'lucide-react';

// 추천 결과 빈상태 — 시간 +1시간 늘려서 재시도 CTA
// (페이지마다 빈상태 카피가 다르므로 도메인 별 컴포넌트로 분리)

export function EmptyResult({ onRelax }: { onRelax: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
      <Search className="mx-auto h-8 w-8 text-gray-300" aria-hidden />
      <div className="mt-2 text-sm font-medium text-gray-700">
        조건에 맞는 한적한 곳을 찾지 못했어요
      </div>
      <p className="mt-1 text-xs text-gray-500">시간을 늘리거나 다른 출발지로 시도해 보세요</p>
      <button
        type="button"
        onClick={onRelax}
        className="mt-3 rounded bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-hover"
      >
        시간 +1시간 늘려서 다시
      </button>
    </div>
  );
}
