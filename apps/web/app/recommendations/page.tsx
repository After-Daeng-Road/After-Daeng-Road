import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { History } from 'lucide-react';
import { HistoryCard } from '@/components/recommend/history-card';
import { RecommendationsEmpty } from '@/components/recommend/recommendations-empty';
import { LoginRequiredCard } from '@/components/ui/login-required-card';
import { COPY } from '@/lib/copy';
import type { HistoryResultPoi } from '@/lib/types/recommendation';

// PRD §7.2 [마이펫타임] — 최근 추천 이력

export default async function RecommendationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <LoginRequiredCard
        icon={<History className="h-8 w-8 text-brand" aria-hidden />}
        title={COPY.recs.loginTitle}
        description={COPY.recs.loginDesc}
        callbackUrl="/recommendations"
      />
    );
  }

  const recs = await prisma.recommendation.findMany({
    where: { userId: session.user.id },
    orderBy: { requestAt: 'desc' },
    take: 30,
    select: {
      id: true,
      timeHours: true,
      startAt: true,
      requestAt: true,
      resultsJson: true,
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-ink">{COPY.recs.headTitle}</h1>
        <p className="mt-1 text-xs text-muted">{COPY.recs.headDesc}</p>
      </header>

      {recs.length === 0 ? (
        <RecommendationsEmpty />
      ) : (
        <ul className="space-y-3">
          {recs.map((r) => (
            <HistoryCard
              key={r.id}
              timeHours={r.timeHours}
              startAt={r.startAt}
              requestAt={r.requestAt}
              items={(r.resultsJson as HistoryResultPoi[] | null) ?? []}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
