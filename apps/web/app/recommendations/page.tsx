import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Clock, History, Leaf, MapPin, PawPrint } from 'lucide-react';
import { RecommendationsEmpty } from '@/components/recommend/recommendations-empty';
import { Chip } from '@/components/ui/chip';
import { LoginRequiredCard } from '@/components/ui/login-required-card';
import { formatDate, formatRelative } from '@/lib/format';
import type { HistoryResultPoi } from '@/lib/types/recommendation';

// PRD §7.2 [마이펫타임] — 최근 추천 이력

export default async function RecommendationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <LoginRequiredCard
        icon={<History className="h-8 w-8 text-brand" aria-hidden />}
        title="로그인하면 추천 이력을 볼 수 있어요"
        description="한적도가 매시간 갱신돼 같은 곳도 시점에 따라 결과가 달라져요."
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
        <h1 className="text-xl font-bold">최근 추천 이력</h1>
        <p className="mt-1 text-xs text-gray-500">
          한적도가 매시간 갱신되어 같은 곳도 시점에 따라 결과가 달라져요.
        </p>
      </header>

      {recs.length === 0 ? (
        <RecommendationsEmpty />
      ) : (
        <ul className="space-y-3">
          {recs.map((r) => {
            const items = (r.resultsJson as HistoryResultPoi[] | null) ?? [];
            return (
              <li key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 font-semibold text-brand">
                    <Clock className="h-3 w-3" aria-hidden /> {r.timeHours}시간 코스
                  </span>
                  <span className="text-gray-500">{formatDate(r.startAt)}</span>
                  <span className="ml-auto text-[11px] text-gray-400">
                    {formatRelative(r.requestAt)}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    조건에 맞는 한적한 곳을 찾지 못했어요
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {items.slice(0, 3).map((it, i) => (
                      <li key={it.poiId}>
                        <Link
                          href={`/poi/${it.poiId}`}
                          className="flex items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 hover:border-brand hover:bg-white"
                        >
                          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{it.name}</span>
                            {it.address && (
                              <span className="block truncate text-[11px] text-gray-500">
                                {it.address}
                              </span>
                            )}
                            {it.reason && (
                              <span className="mt-1 flex flex-wrap gap-1">
                                {it.reason.distanceKm != null && (
                                  <Chip
                                    size="xs"
                                    icon={<MapPin className="h-2.5 w-2.5" aria-hidden />}
                                  >
                                    {it.reason.distanceKm}km · {it.reason.etaMin}분
                                  </Chip>
                                )}
                                {it.reason.quietnessNow != null && (
                                  <Chip
                                    size="xs"
                                    variant="green"
                                    icon={<Leaf className="h-2.5 w-2.5" aria-hidden />}
                                  >
                                    한적도 {it.reason.quietnessNow}
                                  </Chip>
                                )}
                                {it.reason.verifiedCount != null && it.reason.verifiedCount > 0 && (
                                  <Chip
                                    size="xs"
                                    variant="pink"
                                    icon={<PawPrint className="h-2.5 w-2.5" aria-hidden />}
                                  >
                                    검증 {it.reason.verifiedCount}명
                                  </Chip>
                                )}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
