import Link from 'next/link';
import { ArrowRight, Inbox, Sparkles } from 'lucide-react';

// /recommendations 페이지의 빈 이력 상태 — Inbox 아이콘 + 메인으로 보내는 CTA
// (home 의 EmptyResult 는 "결과 못 찾음" + 슬라이더 relax — 다른 의미라 별도 컴포넌트)

export function RecommendationsEmpty() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <Inbox className="mx-auto h-10 w-10 text-gray-300" aria-hidden />
      <p className="mt-3 text-sm font-medium text-gray-700">아직 추천 이력이 없어요</p>
      <p className="mt-1 text-xs text-gray-500">메인에서 시간 슬라이더로 첫 추천을 받아보세요</p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-hover"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> 지금 추천받기
        <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}
