'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { COPY } from '@/lib/copy';
import { EmptyResult } from './empty-result';
import { RecommendCard } from './recommend-card';
import { RecommendSkeleton } from './recommend-skeleton';
import type { DeparturePoint } from '@/lib/format';
import type { Recommendation } from '@/lib/types/recommendation';

// 추천 결과 영역 — 에디토리얼 헤딩 + 로딩/빈/카드 리스트 분기 (DESIGN_SYSTEM §9.1)
// 페이지네이션: 1페이지 = 첫 3곳(PRD §6.1), 2페이지부터 10곳씩 화면 교체.
// 데이터는 서버 offset 페이지네이션(PR #30)으로 필요한 페이지에 도달할 때만 10개씩 가져온다.
// 관심사: 결과 상태 표시. 데이터 fetching·zod 검증은 페이지/RecommendForm.

const R = COPY.home.results;
const FIRST_PAGE_SIZE = 3; // PRD §6.1 "추천 3곳"
const PAGE_SIZE = 10;

// p 페이지의 [start, end) — 0페이지는 3개, 이후 10개씩
const pageRange = (p: number): [number, number] => {
  if (p === 0) return [0, FIRST_PAGE_SIZE];
  const start = FIRST_PAGE_SIZE + PAGE_SIZE * (p - 1);
  return [start, start + PAGE_SIZE];
};

export function RecommendResults({
  results,
  loading,
  timeHours,
  onRelax,
  departure,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  results: Recommendation[] | null;
  loading: boolean;
  timeHours: number;
  onRelax: () => void;
  departure?: DeparturePoint;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => Promise<boolean>;
}) {
  const [page, setPage] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  const total = results?.length ?? 0;
  // 로드된 데이터 기준 페이지 수: 3개 = 1페이지, 이후 10개마다 +1
  const loadedPages =
    total <= FIRST_PAGE_SIZE ? 1 : 1 + Math.ceil((total - FIRST_PAGE_SIZE) / PAGE_SIZE);

  // 새 검색(결과 축소·초기화) 시 현재 페이지가 범위를 벗어나면 1페이지로
  useEffect(() => {
    if (page >= loadedPages) setPage(0);
  }, [page, loadedPages]);

  if (!loading && results === null) return null;

  const [start, end] = pageRange(page);
  const pageItems = results?.slice(start, end) ?? [];
  const canNext = page < loadedPages - 1 || hasMore;

  const scrollTop = () =>
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const goTo = (p: number) => {
    setPage(p);
    scrollTop();
  };

  // 다음 — 이미 로드된 페이지면 이동만, 아니면 서버에서 10개 받아온 뒤 이동
  const goNext = async () => {
    if (page < loadedPages - 1) {
      goTo(page + 1);
      return;
    }
    if (!hasMore || loadingMore) return;
    const ok = await onLoadMore();
    if (ok) goTo(page + 1);
  };

  const pagerBtn =
    'grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-brand hover:text-ink disabled:pointer-events-none disabled:opacity-35';

  return (
    <section ref={sectionRef} className="scroll-mt-20 py-[clamp(56px,8vw,96px)]">
      <div className="mb-9 flex items-end justify-between gap-5">
        <div>
          <div className="eyebrow">{R.eyebrow}</div>
          <h2 className="mt-2.5 text-[clamp(26px,3.4vw,38px)] font-bold leading-[1.1] tracking-[-0.03em] text-ink">
            <b className="font-bold text-brand-ink">{R.headHours(timeHours)}</b>
            {R.headMid}
            <br />
            {R.head2}
          </h2>
        </div>
      </div>

      {loading && <RecommendSkeleton />}

      {!loading && results !== null && results.length === 0 && <EmptyResult onRelax={onRelax} />}

      {!loading &&
        results !== null &&
        pageItems.map((rec) => <RecommendCard key={rec.poiId} rec={rec} departure={departure} />)}

      {/* 페이지네이션 — 결과가 첫 페이지를 넘거나 서버에 더 있을 때만 */}
      {!loading && results !== null && results.length > 0 && (loadedPages > 1 || hasMore) && (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label={R.paginationAria}>
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page === 0}
            aria-label={R.prevPage}
            className={pagerBtn}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          {Array.from({ length: loadedPages }, (_, p) => (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              aria-label={R.pageAria(p + 1)}
              aria-current={p === page ? 'page' : undefined}
              className={`fig grid h-9 w-9 place-items-center rounded-full text-[14px] transition-colors ${
                p === page
                  ? 'bg-brand font-medium text-white dark:text-[#20160f]'
                  : 'border border-line text-muted hover:border-brand hover:text-ink'
              }`}
            >
              {p + 1}
            </button>
          ))}
          {/* 아직 안 받아온 페이지가 남아 있다는 표시 — 누르면 다음 10곳 로드 */}
          {hasMore && (
            <button
              type="button"
              onClick={goNext}
              disabled={loadingMore}
              aria-label={R.nextPage}
              className={`fig grid h-9 w-9 place-items-center rounded-full border border-dashed border-line text-[14px] text-faint transition-colors hover:border-brand hover:text-ink disabled:pointer-events-none ${
                loadingMore ? 'animate-pulse' : ''
              }`}
            >
              …
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext || loadingMore}
            aria-label={R.nextPage}
            className={`${pagerBtn} ${loadingMore ? 'animate-pulse' : ''}`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </nav>
      )}
    </section>
  );
}
