import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { listPets } from '@/lib/actions/pets';
import {
  Bell,
  ChevronRight,
  Dog,
  FileText,
  Heart,
  History,
  LogOut,
  Plus,
  Shield,
  Star,
} from 'lucide-react';
import { LoginRequiredCard } from '@/components/ui/login-required-card';
import { NavListItem } from '@/components/ui/nav-list-item';
import { Stat } from '@/components/ui/stat';
import { COPY } from '@/lib/copy';

// PRD §7.2 [마이펫타임] — 펫 프로필 / 다녀온 곳 / 후기 / 알림 설정

export default async function MePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <LoginRequiredCard
        icon={<Dog className="h-8 w-8 text-brand" aria-hidden />}
        title={COPY.me.loginTitle}
        description={COPY.me.loginDesc}
        callbackUrl="/me"
        ctaLabel={COPY.me.loginCta}
        footer={COPY.me.loginFooter}
      />
    );
  }

  const pets = await listPets();
  const displayName = session.user.name ?? COPY.me.displayNameFallback;
  const email = session.user.email ?? '';

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      {/* 프로필 카드 */}
      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft">
            <Dog className="h-7 w-7 text-brand" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-ink">{displayName}</div>
            {email && <div className="truncate text-xs text-muted">{email}</div>}
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-field border border-line px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-2"
            >
              <LogOut className="h-3 w-3" aria-hidden /> {COPY.me.logout}
            </button>
          </form>
        </div>

        {/* 활동 요약 */}
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-3 text-center">
          <Stat label={COPY.me.statVisited} value={0} />
          <Stat label={COPY.me.statReviews} value={0} />
          <Stat label={COPY.me.statVerified} value={0} />
        </div>
      </section>

      {/* 내 반려견 */}
      <section className="mt-4 rounded-card border border-line bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">{COPY.me.petsTitle}</h2>
          <Link
            href="/me/pets/new"
            className="inline-flex items-center gap-0.5 text-xs text-brand hover:underline"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> {COPY.me.petsAdd}
          </Link>
        </div>
        {pets.length === 0 ? (
          <Link
            href="/me/pets/new"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line bg-surface-2 px-4 py-6 text-center transition-colors hover:border-brand"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
              <Plus className="h-5 w-5 text-faint" aria-hidden />
            </div>
            <span className="text-sm font-medium text-ink">{COPY.me.petsEmptyTitle}</span>
            <span className="text-xs text-muted">{COPY.me.petsEmptyDesc}</span>
          </Link>
        ) : (
          <ul className="space-y-2">
            {pets.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/me/pets/${p.id}`}
                  className="flex items-center gap-3 rounded-xl border border-line-soft bg-surface-2 px-3 py-3 transition-colors hover:border-brand"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface">
                    <Dog className="h-5 w-5 text-brand" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{p.name}</div>
                    <div className="text-[11px] text-muted">
                      {COPY.me.petMeta(p.breed, String(p.weightKg), p.ageYears)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 메뉴 */}
      <nav className="mt-4 space-y-2">
        <NavListItem
          href="/me/settings"
          icon={<Bell className="h-4 w-4" aria-hidden />}
          title={COPY.me.menuNotify}
          subtitle={COPY.me.menuNotifySub}
        />
        <NavListItem
          href="/recommendations"
          icon={<History className="h-4 w-4" aria-hidden />}
          title={COPY.me.menuHistory}
          subtitle={COPY.me.menuHistorySub}
        />
        <NavListItem
          href="#"
          icon={<Star className="h-4 w-4" aria-hidden />}
          title={COPY.me.menuReviews}
          subtitle={COPY.me.menuReviewsSub}
          disabled
        />
        <NavListItem
          href="#"
          icon={<Heart className="h-4 w-4" aria-hidden />}
          title={COPY.me.menuSaved}
          subtitle={COPY.me.menuSavedSub}
          disabled
        />
      </nav>

      <div className="mt-6 flex items-center gap-4 px-1 text-xs text-muted">
        <Link href="/legal/terms" className="inline-flex items-center gap-1 hover:text-body">
          <FileText className="h-3 w-3" aria-hidden /> {COPY.common.terms}
        </Link>
        <span className="text-faint" aria-hidden>
          ·
        </span>
        <Link href="/legal/privacy" className="inline-flex items-center gap-1 hover:text-body">
          <Shield className="h-3 w-3" aria-hidden /> {COPY.common.privacy}
        </Link>
      </div>
    </main>
  );
}
