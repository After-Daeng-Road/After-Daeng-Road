'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { toggleBookmark } from '@/lib/actions/bookmarks';
import { COPY } from '@/lib/copy';

// POI 상세 · 추천 카드에서 재사용하는 북마크 토글 버튼 (QA #5).
// 낙관적 업데이트 후 서버 응답으로 확정 — 미로그인(Unauthorized)이면 롤백하고 로그인 페이지로 이동.

export function BookmarkButton({
  poiId,
  initialBookmarked,
  className,
}: {
  poiId: string;
  initialBookmarked: boolean;
  className?: string;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

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
