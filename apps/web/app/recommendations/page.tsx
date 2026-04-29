import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// 사용자의 최근 추천 이력 (PRD §7.2 [마이펫타임] — 다녀온 곳)

type ResultPoi = { poiId: string; name: string };

export default async function RecommendationsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

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
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-xl font-bold">최근 추천 이력</h1>
      <p className="mb-6 text-xs text-gray-500">
        한적도가 매시간 갱신되어 같은 곳도 시점에 따라 결과가 달라져요.
      </p>

      {recs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">아직 추천 이력이 없어요.</p>
          <Link
            href="/"
            className="mt-3 inline-block rounded-md bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover"
          >
            지금 추천받기 →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {recs.map((r) => {
            const items = (r.resultsJson as ResultPoi[] | null) ?? [];
            return (
              <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {r.timeHours}시간 · {formatDate(r.startAt)}
                  </span>
                  <span>{formatRelative(r.requestAt)}</span>
                </div>
                <ol className="space-y-1 text-sm">
                  {items.slice(0, 3).map((it, i) => (
                    <li key={it.poiId}>
                      <Link href={`/poi/${it.poiId}`} className="hover:underline">
                        {i + 1}. {it.name}
                      </Link>
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '방금';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
