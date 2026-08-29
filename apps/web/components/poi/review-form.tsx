'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { createReview } from '@/lib/actions/reviews';
import { COPY } from '@/lib/copy';

// POI 상세 후기 작성 폼 — createReview(server action) 호출 (QA #5).
// 성공 시 서버가 revalidatePath('/poi/:id') 하므로 router.refresh() 로 목록만 즉시 반영.
// 미로그인(Unauthorized) 이면 로그인 페이지로 이동.

const MAX_BODY = 2000;

export function ReviewForm({ poiId }: { poiId: string }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setError(COPY.poi.reviewForm.ratingRequired);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createReview({
        poiId,
        rating,
        body: body.trim() ? body.trim() : undefined,
        photos: [],
      });
      if (res.ok) {
        setRating(0);
        setBody('');
        router.refresh();
        return;
      }
      if (res.error === 'Unauthorized') {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname || `/poi/${poiId}`)}`);
        return;
      }
      setError(res.error);
    });
  };

  return (
    <section className="mt-5 rounded-card border border-line bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink">{COPY.poi.reviewForm.title}</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <span className="mb-1 block text-xs font-medium text-muted">
            {COPY.poi.reviewForm.ratingLabel}
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={COPY.poi.ratingAria(n)}
                className="p-0.5"
              >
                <Star
                  className={`h-5 w-5 ${
                    n <= (hoverRating || rating)
                      ? 'fill-brand text-brand'
                      : 'fill-transparent text-line'
                  }`}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="review-body" className="mb-1 block text-xs font-medium text-muted">
            {COPY.poi.reviewForm.bodyLabel}
          </label>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
            maxLength={MAX_BODY}
            rows={3}
            placeholder={COPY.poi.reviewForm.bodyPlaceholder}
            className="w-full resize-none rounded-field border border-line bg-surface-2 px-3 py-2 text-sm text-body"
          />
          <div className="mt-1 text-right text-[10px] text-faint">
            {body.length}/{MAX_BODY}
          </div>
        </div>

        {error && <p className="mb-2 text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-field bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50 dark:text-[#20160f]"
        >
          {isPending ? COPY.poi.reviewForm.submitting : COPY.poi.reviewForm.submit}
        </button>
      </form>
    </section>
  );
}
