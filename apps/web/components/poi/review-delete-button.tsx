'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteReview } from '@/lib/actions/reviews';
import { COPY } from '@/lib/copy';

// 내가 쓴 후기 삭제 — confirm 후 deleteReview, 성공 시 router.refresh 로 목록 갱신

const M = COPY.myReviews;

export function ReviewDeleteButton({ reviewId }: { reviewId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (!window.confirm(M.deleteConfirm)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteReview(reviewId);
      if (res.ok) router.refresh();
      else setError(M.deleteFail);
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-[11px] text-danger">{error}</span>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-field border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3" aria-hidden />
        {isPending ? M.deleting : M.delete}
      </button>
    </span>
  );
}
