import { MessageSquare, Star } from 'lucide-react';
import { COPY } from '@/lib/copy';
import { formatDate } from '@/lib/format';
import { ReportReviewButton } from './report-review-button';

// POI 상세의 방문 후기 목록 (공개 리뷰). getPoiDetail 이 반환한 poi.reviews 를 렌더.
// 서버 렌더 + 리뷰별 신고 버튼(클라이언트)만 인터랙션.

// getPoiDetail(pois.ts)이 include 로 돌려주는 리뷰 형태의 구조적 타입
export type PoiReview = {
  id: string;
  rating: number;
  body: string | null;
  photos: string[];
  createdAt: Date;
  user: { nickname: string | null };
  reply: { body: string; createdAt: Date } | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={COPY.poi.ratingAria(rating)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? 'fill-brand text-brand' : 'fill-transparent text-line'}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function ReviewList({ reviews }: { reviews: PoiReview[] }) {
  return (
    <section className="mt-5 rounded-card border border-line bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <MessageSquare className="h-4 w-4 text-muted" aria-hidden />
        {COPY.poi.reviewsTitle}
        {reviews.length > 0 && <span className="fig text-muted">{reviews.length}</span>}
      </h2>

      {reviews.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">{COPY.poi.reviewsEmpty}</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="border-t border-line-soft pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink">
                  {r.user.nickname || COPY.poi.anonymous}
                </span>
                <span className="flex-shrink-0 text-[11px] text-faint">
                  {formatDate(r.createdAt)}
                </span>
              </div>
              <div className="mt-1">
                <Stars rating={r.rating} />
              </div>

              {r.body && (
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-body">
                  {r.body}
                </p>
              )}

              {r.photos.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {r.photos.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 flex-shrink-0 rounded-field object-cover"
                    />
                  ))}
                </div>
              )}

              {r.reply && (
                <div className="mt-2.5 rounded-field bg-surface-2 p-3">
                  <div className="text-[11px] font-semibold text-brand-ink">
                    {COPY.poi.reviewReply}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-body">
                    {r.reply.body}
                  </p>
                </div>
              )}

              <div className="mt-2 flex justify-end">
                <ReportReviewButton reviewId={r.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
