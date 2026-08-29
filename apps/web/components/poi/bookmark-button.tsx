'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { isBookmarked as fetchBookmarked, toggleBookmark } from '@/lib/actions/bookmarks';
import { COPY } from '@/lib/copy';

// POI 상세 · 추천 카드에서 재사용하는 북마크 토글 버튼 (QA #5).
// 낙관적 업데이트 후 서버 응답으로 확정 — 미로그인(Unauthorized)이면 롤백하고 로그인 페이지로 이동.
// initialBookmarked 미제공(추천 카드)이면 마운트 시 서버에서 실제 상태를 조회한다
// → 새로고침해도 저장된 북마크가 카드에 반영됨(QA: 홈에서 북마크 풀려 보이던 문제).

export function BookmarkButton({
  poiId,
  initialBookmarked,
  className,
}: {
  poiId: string;
  initialBookmarked?: boolean;
  className?: string;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked ?? false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  // 서버가 초기값을 주입하지 않은 경우(추천 카드)만 실제 상태를 조회
  useEffect(() => {
    if (initialBookmarked !== undefined) return;
    let active = true;
    fetchBookmarked(poiId).then((b) => {
      if (active) setBookmarked(b);
    });
    return () => {
      active = false;
    };
  }, [poiId, initialBookmarked]);

  const handleClick = () => {
    if (isPending) return;
    const next = !bookmarked;
    setBookmarked(next); // 낙관적 업데이트

    startTransition(async () => {
      const res = await toggleBookmark({ poiId });
      if (!res.ok) {
        setBookmarked(!next); // 롤백
        if (res.error === 'Unauthorized') {
          router.push(`/login?callbackUrl=${encodeURIComponent(pathname || '/')}`);
        }
        return;
      }
      setBookmarked(res.bookmarked);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? COPY.poi.bookmarkRemove : COPY.poi.bookmarkAdd}
      className={
        className ??
        'inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-brand disabled:cursor-default disabled:opacity-60'
      }
    >
      {bookmarked ? (
        <BookmarkCheck className="h-4 w-4 text-brand" aria-hidden />
      ) : (
        <Bookmark className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
