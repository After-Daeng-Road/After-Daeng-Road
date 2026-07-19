import Link from 'next/link';
import { ArrowRight, Inbox, Sparkles } from 'lucide-react';
import { COPY } from '@/lib/copy';

// /recommendations 페이지의 빈 이력 상태 — Inbox 아이콘 + 메인으로 보내는 CTA
// (home 의 EmptyResult 는 "결과 못 찾음" + 슬라이더 relax — 다른 의미라 별도 컴포넌트)

export function RecommendationsEmpty() {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface p-10 text-center">
      <Inbox className="mx-auto h-10 w-10 text-faint" aria-hidden />
      <p className="mt-3 text-sm font-medium text-ink">{COPY.recs.emptyTitle}</p>
      <p className="mt-1 text-xs text-muted">{COPY.recs.emptyDesc}</p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-1.5 rounded-field bg-brand px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover dark:text-[#20160f]"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> {COPY.recs.emptyCta}
        <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}
