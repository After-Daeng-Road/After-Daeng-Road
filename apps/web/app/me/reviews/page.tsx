import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Star } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { LoginRequiredCard } from '@/components/ui/login-required-card';
import { ReviewDeleteButton } from '@/components/poi/review-delete-button';
import { COPY } from '@/lib/copy';
import { formatDate } from '@/lib/format';

// PRD §7.2 [마이펫타임] — 내가 쓴 후기 목록·관리

const M = COPY.myReviews;

export default async function MyReviewsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <LoginRequiredCard
        icon={<Star className="h-8 w-8 text-brand" aria-hidden />}
        title={M.loginTitle}
        description={M.loginDesc}
        callbackUrl="/me/reviews"
      />
    );
  }

  const reviews = await prisma.review.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      body: true,
      photos: true,
      status: true,
      createdAt: true,
      poi: { select: { id: true, name: true } },
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-ink">{M.headTitle}</h1>
        <p className="mt-1 text-xs text-muted">{M.headDesc}</p>
      </header>

      {reviews.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-surface p-10 text-center">
          <Star className="mx-auto h-10 w-10 text-faint" aria-hidden />
          <p className="mt-3 text-sm font-medium text-ink">{M.emptyTitle}</p>
          <p className="mt-1 text-xs text-muted">{M.emptyDesc}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-card border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/poi/${r.poi.id}`}
                    className="text-sm font-semibold text-ink hover:underline"
                  >
                    {r.poi.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex" aria-label={COPY.poi.ratingAria(r.rating)}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-3.5 w-3.5 ${n <= r.rating ? 'fill-brand text-brand' : 'fill-transparent text-line'}`}
                          aria-hidden
                        />
                      ))}
                    </span>
                    <span className="text-[11px] text-faint">{formatDate(r.createdAt)}</span>
                    {r.status === 'HIDDEN_REPORTED' && (
                      <Chip size="xs" variant="pink">
                        {M.hiddenChip}
                      </Chip>
                    )}
                    {r.status === 'REMOVED' && (
                      <Chip size="xs" variant="gray">
                        {M.removedChip}
                      </Chip>
                    )}
                  </div>
                </div>
                <ReviewDeleteButton reviewId={r.id} />
              </div>

              {r.body && (
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-body">
                  {r.body}
                </p>
              )}

              {r.photos.length > 0 && (
                <div className="mt-2.5 flex gap-1.5 overflow-x-auto">
                  {r.photos.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt=""
                      loading="lazy"
                      className="h-16 w-16 flex-shrink-0 rounded-lg border border-line object-cover"
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
