import Link from 'next/link';
import { auth } from '@/auth';
import { listBookmarks } from '@/lib/actions/bookmarks';
import { Heart, Leaf, PawPrint, Sprout } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { LoginRequiredCard } from '@/components/ui/login-required-card';
import { PoiImageFallback } from '@/components/poi/poi-image-fallback';
import { COPY } from '@/lib/copy';

// PRD §7.2 [마이펫타임] — 저장한 장소(북마크) 목록 (QA #5)

export default async function SavedPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <LoginRequiredCard
        icon={<Heart className="h-8 w-8 text-brand" aria-hidden />}
        title={COPY.saved.loginTitle}
        description={COPY.saved.loginDesc}
        callbackUrl="/me/saved"
      />
    );
  }

  const bookmarks = await listBookmarks();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-ink">{COPY.saved.headTitle}</h1>
        <p className="mt-1 text-xs text-muted">{COPY.saved.headDesc}</p>
      </header>

      {bookmarks.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-surface p-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-faint" aria-hidden />
          <p className="mt-3 text-sm font-medium text-ink">{COPY.saved.emptyTitle}</p>
          <p className="mt-1 text-xs text-muted">{COPY.saved.emptyDesc}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {bookmarks.map(({ bookmarkId, poi }) => (
            <li key={bookmarkId}>
              <Link
                href={`/poi/${poi.id}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand"
              >
                {poi.imageUrls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poi.imageUrls[0]}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                    <PoiImageFallback type={poi.type} iconClassName="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{poi.name}</div>
                  {poi.address && (
                    <div className="truncate text-[11px] text-muted">{poi.address}</div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {poi.petAllowed && (
                      <Chip
                        size="xs"
                        variant="brand"
                        icon={<PawPrint className="h-2.5 w-2.5" aria-hidden />}
                      >
                        {COPY.poi.petAllowed}
                      </Chip>
                    )}
                    {poi.isWellness && (
                      <Chip
                        size="xs"
                        variant="blue"
                        icon={<Sprout className="h-2.5 w-2.5" aria-hidden />}
                      >
                        {COPY.poi.wellness}
                      </Chip>
                    )}
                    {poi.isEco && (
                      <Chip
                        size="xs"
                        variant="green"
                        icon={<Leaf className="h-2.5 w-2.5" aria-hidden />}
                      >
                        {COPY.poi.eco}
                      </Chip>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
