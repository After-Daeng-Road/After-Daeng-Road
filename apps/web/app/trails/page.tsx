import { prisma } from '@/lib/prisma';
import { COPY } from '@/lib/copy';
import { TrailCard } from '@/components/trails/trail-card';

// 두루누비 산책로 — 충남 걷기여행길 16코스를 한 번에 카드로 (PRD §13 두루누비 연동 1차)
// 데이터가 16건 고정·저변동이라 하루 1회 재검증 캐시로 충분하다.

export const revalidate = 86400;

const T = COPY.trails;

export const metadata = { title: T.headTitle };

/**
 * path_geojson(LineString) → [lng, lat][]. seed-durunubi 가 넣은 형태 그대로지만
 * Json 컬럼이라 런타임에 다시 확인한다 — 형식이 어긋나면 미리보기만 빠지고 카드는 그대로.
 */
function toPoints(geo: unknown): [number, number][] {
  if (!geo || typeof geo !== 'object') return [];
  const coords = (geo as { type?: string; coordinates?: unknown }).coordinates;
  if (!Array.isArray(coords)) return [];
  const out: [number, number][] = [];
  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 2) continue;
    const lng = Number(c[0]);
    const lat = Number(c[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) out.push([lng, lat]);
  }
  return out;
}

export default async function TrailsPage() {
  const courses = await prisma.durunubiCourse.findMany({
    orderBy: { crsName: 'asc' },
    select: {
      id: true,
      crsName: true,
      themeName: true,
      sigunText: true,
      totalDistanceKm: true,
      totalElevationM: true,
      estimatedMin: true,
      difficultyLevel: true,
      description: true,
      pathGeoJson: true,
      poi: { select: { name: true, lat: true, lng: true } },
    },
  });

  return (
    <main className="mx-auto max-w-[1080px] px-5 py-8 sm:px-8 sm:py-10">
      <header className="mb-7">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">{T.headTitle}</h1>
        <p className="mt-1.5 text-[13px] text-muted">{T.headDesc}</p>
        <p className="mt-1 text-xs text-faint">
          <span className="fig">{courses.length}</span>
          {T.countUnit}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {courses.map((c) => (
          <TrailCard
            key={c.id}
            name={c.crsName}
            themeName={c.themeName}
            sigunText={c.sigunText}
            description={c.description}
            distanceKm={Number(c.totalDistanceKm)}
            elevationM={c.totalElevationM}
            estimatedMin={c.estimatedMin}
            level={Math.min(Math.max(c.difficultyLevel ?? 2, 1), 3)}
            start={c.poi}
            points={toPoints(c.pathGeoJson)}
          />
        ))}
      </div>
    </main>
  );
}
