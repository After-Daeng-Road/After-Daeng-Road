import { notFound } from 'next/navigation';
import { getPoiDetail } from '@/lib/actions/pois';
import { BadgeCheck, Leaf, Navigation, PawPrint, Sprout, TreePine } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { ReviewList } from '@/components/poi/review-list';
import { COPY } from '@/lib/copy';
import { kakaoDirectionsUrl } from '@/lib/format';

// PRD §7.2 [장소 상세] — 사진·소개·펫정책 / 한적도 시간대 차트 / 검증 진행도 / 후기

export default async function PoiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPoiDetail({ poiId: id });
  if (!detail) notFound();

  const { poi, hourly, verifiedCount } = detail;
  const maxScore = Math.max(...hourly.map((h) => h.score), 100);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      {poi.imageUrls?.[0] && (
        <div
          className="mb-4 h-56 w-full rounded-card bg-cover bg-center"
          style={{ backgroundImage: `url(${poi.imageUrls[0]})` }}
          aria-hidden
        />
      )}

      <h1 className="text-xl font-bold text-ink">{poi.name}</h1>
      <p className="mt-1 text-sm text-muted">{poi.address}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {poi.petAllowed && (
          <Chip variant="brand" icon={<PawPrint className="h-3 w-3" aria-hidden />}>
            {COPY.poi.petAllowed}
          </Chip>
        )}
        {poi.isWellness && (
          <Chip variant="blue" icon={<Sprout className="h-3 w-3" aria-hidden />}>
            {COPY.poi.wellness}
          </Chip>
        )}
        {poi.isEco && (
          <Chip variant="green" icon={<Leaf className="h-3 w-3" aria-hidden />}>
            {COPY.poi.eco}
          </Chip>
        )}
        {poi.durunubi && (
          <Chip variant="gray" icon={<TreePine className="h-3 w-3" aria-hidden />}>
            {COPY.poi.durunubi}
          </Chip>
        )}
      </div>

      {poi.petPolicyText && (
        <section className="mt-5 rounded-card border border-line bg-surface p-4">
          <h2 className="mb-1 text-sm font-semibold text-ink">{COPY.poi.petPolicy}</h2>
          <p className="text-xs text-muted">{poi.petPolicyText}</p>
        </section>
      )}

      {/* 한적도 시간대별 차트 (PRD §7.2) */}
      <section className="mt-5 rounded-card border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">{COPY.poi.hourlyTitle}</h2>
        {hourly.length === 0 ? (
          <p className="text-xs text-muted">{COPY.poi.hourlyEmpty}</p>
        ) : (
          <div className="flex h-24 items-end gap-0.5">
            {Array.from({ length: 24 }).map((_, h) => {
              const slot = hourly.find((x) => x.hourSlot === h);
              const height = slot ? (slot.score / maxScore) * 100 : 0;
              return (
                <div key={h} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-quiet"
                    style={{ height: `${height}%`, minHeight: slot ? '2px' : '0' }}
                    title={
                      slot ? COPY.poi.hourTooltip(h, slot.score) : COPY.poi.hourTooltipEmpty(h)
                    }
                  />
                  {h % 6 === 0 && <span className="text-[9px] text-faint">{h}</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 검증 진행도 (PRD §6.3 — 3명 임계값) */}
      <section className="mt-5 rounded-card border border-line bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">{COPY.poi.verifyTitle}</h2>
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-muted">
            {COPY.poi.verifyProgress(verifiedCount)}
            {verifiedCount >= 3 && <BadgeCheck className="h-3.5 w-3.5 text-verify" aria-hidden />}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full bg-verify transition-all"
            style={{ width: `${Math.min(100, (verifiedCount / 3) * 100)}%` }}
          />
        </div>
      </section>

      {/* 방문 후기 (PRD §7.2) — getPoiDetail 이 반환한 공개 리뷰 */}
      <ReviewList reviews={poi.reviews} />

      <div className="mt-6 flex gap-2">
        <a
          href={kakaoDirectionsUrl(poi.name, poi.lat, poi.lng)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-field bg-brand px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-hover dark:text-[#20160f]"
        >
          <Navigation className="h-4 w-4" aria-hidden /> {COPY.poi.kakao}
        </a>
      </div>
    </main>
  );
}
