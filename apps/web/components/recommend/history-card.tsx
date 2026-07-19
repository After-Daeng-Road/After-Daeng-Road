import Link from 'next/link';
import { Clock, Leaf, MapPin, PawPrint } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { COPY } from '@/lib/copy';
import { formatDate, formatRelative } from '@/lib/format';
import type { HistoryResultPoi } from '@/lib/types/recommendation';

// /recommendations 이력 카드 1개 — 코스 메타(시간/시각/상대시간) + Top 3 POI 링크
// `<li>` 자체를 컴포넌트가 렌더 — 부모 `<ul>` 안에서 사용

export function HistoryCard({
  timeHours,
  startAt,
  requestAt,
  items,
}: {
  timeHours: number;
  startAt: Date;
  requestAt: Date;
  items: HistoryResultPoi[];
}) {
  return (
    <li className="rounded-card border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand-ink">
          <Clock className="h-3 w-3" aria-hidden /> {COPY.recs.courseLabel(timeHours)}
        </span>
        <span className="text-muted">{formatDate(startAt)}</span>
        <span className="ml-auto text-[11px] text-faint">{formatRelative(requestAt)}</span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">{COPY.recs.notFound}</p>
      ) : (
        <ol className="space-y-2">
          {items.slice(0, 3).map((it, i) => (
            <li key={it.poiId}>
              <HistoryRow rank={i + 1} item={it} />
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

function HistoryRow({ rank, item }: { rank: number; item: HistoryResultPoi }) {
  return (
    <Link
      href={`/poi/${item.poiId}`}
      className="flex items-start gap-2.5 rounded-lg border border-line-soft bg-surface-2 px-3 py-2.5 transition-colors hover:border-brand hover:bg-surface"
    >
      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white dark:text-[#20160f]">
        {rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
        {item.address && (
          <span className="block truncate text-[11px] text-muted">{item.address}</span>
        )}
        {item.reason && (
          <span className="mt-1 flex flex-wrap gap-1">
            {item.reason.distanceKm != null && (
              <Chip size="xs" icon={<MapPin className="h-2.5 w-2.5" aria-hidden />}>
                {COPY.recs.distChip(item.reason.distanceKm, item.reason.etaMin)}
              </Chip>
            )}
            {item.reason.quietnessNow != null && (
              <Chip size="xs" variant="green" icon={<Leaf className="h-2.5 w-2.5" aria-hidden />}>
                {COPY.recs.quietChip(item.reason.quietnessNow)}
              </Chip>
            )}
            {item.reason.verifiedCount != null && item.reason.verifiedCount > 0 && (
              <Chip
                size="xs"
                variant="pink"
                icon={<PawPrint className="h-2.5 w-2.5" aria-hidden />}
              >
                {COPY.recs.verifyChip(item.reason.verifiedCount)}
              </Chip>
            )}
          </span>
        )}
      </span>
    </Link>
  );
}
