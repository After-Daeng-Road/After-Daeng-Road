'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { LogIn, Star } from 'lucide-react';
import { createReview } from '@/lib/actions/reviews';
import { COPY } from '@/lib/copy';
import dynamic from 'next/dynamic';

// PhotoUpload 는 @supabase/supabase-js(브라우저 직접 업로드)를 끌어온다.
// 상세 페이지 초기 번들에서 빼고, 후기 작성 영역이 실제로 그려질 때 받는다.
const PhotoUpload = dynamic(() => import('@/components/photo-upload').then((m) => m.PhotoUpload), {
  ssr: false,
});

// POI 방문 후기 작성 — 별점 + 텍스트 + 사진 → createReview.
// 비로그인 시 로그인 유도(게이트). 성공 시 router.refresh() 로 목록 갱신.

const P = COPY.poi;

function RatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={P.ratingLabel}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          aria-label={P.ratingAria(n)}
          aria-checked={value === n}
          role="radio"
          className="cursor-pointer p-0.5"
        >
          <Star
            className={`h-6 w-6 ${(hover || value) >= n ? 'fill-brand text-brand' : 'fill-transparent text-line'}`}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({ poiId }: { poiId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // 비로그인 → 로그인 유도
  if (status !== 'authenticated') {
    return (
      <section className="mt-5 rounded-card border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">{P.reviewFormTitle}</h2>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/poi/${poiId}`)}`}
          className="inline-flex items-center gap-1.5 rounded-field bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover dark:text-[#20160f]"
        >
          <LogIn className="h-4 w-4" aria-hidden /> {P.reviewLoginCta}
        </Link>
      </section>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (rating < 1) {
      setMessage({ type: 'err', text: P.ratingRequired });
      return;
    }
    startTransition(async () => {
      const res = await createReview({ poiId, rating, body: body.trim() || undefined, photos });
      if (res.ok) {
        setMessage({ type: 'ok', text: P.reviewSaved });
        setRating(0);
        setBody('');
        setPhotos([]);
        router.refresh();
      } else {
        setMessage({
          type: 'err',
          text: res.error === 'Unauthorized' ? P.reviewLoginError : res.error,
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 rounded-card border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">{P.reviewFormTitle}</h2>

      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-muted">{P.ratingLabel}</label>
        <RatingInput value={rating} onChange={setRating} />
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-muted">{P.reviewBodyLabel}</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder={P.reviewBodyPlaceholder}
          className="w-full resize-none rounded-field border border-line bg-surface-2 px-3 py-2 text-sm text-body placeholder:text-faint focus:border-brand focus:outline-none"
        />
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-muted">{P.reviewPhotosLabel}</label>
        <PhotoUpload purpose="reviews" poiId={poiId} value={photos} onChange={setPhotos} max={8} />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full rounded-field bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50 dark:text-[#20160f]"
      >
        {isPending ? P.reviewSubmitting : P.reviewSubmit}
      </button>

      {message && (
        <p
          className={`mt-2 text-center text-xs ${message.type === 'ok' ? 'text-quiet' : 'text-danger'}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
