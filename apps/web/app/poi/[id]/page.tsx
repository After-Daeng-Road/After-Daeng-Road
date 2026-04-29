import { notFound } from 'next/navigation';
import { getPoiDetail } from '@/lib/actions/pois';

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
          className="mb-4 h-56 w-full rounded-2xl bg-cover bg-center"
          style={{ backgroundImage: `url(${poi.imageUrls[0]})` }}
          aria-hidden
        />
      )}

      <h1 className="text-xl font-bold">{poi.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{poi.address}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {poi.petAllowed && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
            펫 동반
          </span>
        )}
        {poi.isWellness && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">웰니스</span>
        )}
        {poi.isEco && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">생태</span>
        )}
        {poi.durunubi && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
            두루누비
          </span>
        )}
      </div>

      {poi.petPolicyText && (
        <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold">펫 정책</h2>
          <p className="text-xs text-gray-600">{poi.petPolicyText}</p>
        </section>
      )}

      {/* 한적도 시간대별 차트 (PRD §7.2) */}
      <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">시간대별 한적도 (오늘)</h2>
        {hourly.length === 0 ? (
          <p className="text-xs text-gray-500">표본 부족 — 데이터 수집 중이에요.</p>
        ) : (
          <div className="flex h-24 items-end gap-0.5">
            {Array.from({ length: 24 }).map((_, h) => {
              const slot = hourly.find((x) => x.hourSlot === h);
              const height = slot ? (slot.score / maxScore) * 100 : 0;
              return (
                <div key={h} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-emerald-400"
                    style={{ height: `${height}%`, minHeight: slot ? '2px' : '0' }}
                    title={slot ? `${h}시 · ${slot.score}점` : `${h}시 · 데이터 없음`}
                  />
                  {h % 6 === 0 && <span className="text-[9px] text-gray-400">{h}</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 검증 진행도 (PRD §6.3 — 3명 임계값) */}
      <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">펫동반 검증 진행도</h2>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">
            방문 검증 {verifiedCount}/3명 {verifiedCount >= 3 && '✓ 검증 완료'}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-pink-500 transition-all"
            style={{ width: `${Math.min(100, (verifiedCount / 3) * 100)}%` }}
          />
        </div>
      </section>

      <div className="mt-6 flex gap-2">
        <a
          href={`https://map.kakao.com/link/to/${encodeURIComponent(poi.name)},${poi.lat},${poi.lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-md bg-brand px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-hover"
        >
          카카오 길찾기
        </a>
      </div>
    </main>
  );
}
