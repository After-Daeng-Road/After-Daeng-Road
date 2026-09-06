import { prisma } from '@/lib/prisma';
import { Clock3, Mountain, Navigation, Route } from 'lucide-react';
import { COPY } from '@/lib/copy';
import { kakaoDirectionsUrl } from '@/lib/format';

// 두루누비 산책로 — 충남 걷기여행길 16코스를 한 번에 카드로 (PRD §13 두루누비 연동 1차)
// 데이터가 16건 고정·저변동이라 하루 1회 재검증 캐시로 충분하다.

export const revalidate = 86400;

const T = COPY.trails;

// 난이도 1~3 — 한적도 뱃지와 같은 신호등 색 체계
const DIFFICULTY_DOT = ['bg-[#16c750]', 'bg-[#ffc400]', 'bg-[#ff3b30]'];

export const metadata = { title: T.headTitle };

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
        {courses.map((c) => {
          const level = Math.min(Math.max(c.difficultyLevel ?? 2, 1), 3);
          return (
            <article
              key={c.id}
              className="flex flex-col rounded-card border border-line bg-surface p-6 transition duration-300 ease-ds hover:-translate-y-[2px] hover:shadow-lift"
            >
              <div className="flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.04em] text-muted">
                <Route className="h-3.5 w-3.5 text-brand" aria-hidden />
                {c.themeName}
                {c.sigunText && (
                  <>
                    <span className="text-faint" aria-hidden>
                      ·
                    </span>
                    {c.sigunText}
                  </>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <h2 className="text-[19px] font-bold tracking-[-0.02em] text-ink">{c.crsName}</h2>
                <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-body">
                  <span
                    className={`h-2 w-2 rounded-full ${DIFFICULTY_DOT[level - 1]}`}
                    aria-hidden
                  />
                  {T.difficulty[level - 1]}
                </span>
              </div>

              {c.description && (
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">
                  {c.description}
                </p>
              )}

              <div className="mt-4 flex border-y border-line-soft py-3.5 text-[12px] text-muted">
                <div className="flex-1">
                  <div className="text-[10.5px] font-semibold tracking-[0.08em]">{T.distance}</div>
                  <div className="mt-0.5 text-ink">
                    <span className="fig text-[19px]">{Number(c.totalDistanceKm)}</span> {T.kmUnit}
                  </div>
                </div>
                <div className="flex-1 border-l border-line-soft pl-4">
                  <div className="flex items-center gap-1 text-[10.5px] font-semibold tracking-[0.08em]">
                    <Clock3 className="h-3 w-3" aria-hidden /> {T.duration}
                  </div>
                  <div className="mt-0.5 text-ink">{T.hourMin(c.estimatedMin ?? 0)}</div>
                </div>
                {c.totalElevationM != null && (
                  <div className="flex-1 border-l border-line-soft pl-4">
                    <div className="flex items-center gap-1 text-[10.5px] font-semibold tracking-[0.08em]">
                      <Mountain className="h-3 w-3" aria-hidden /> {T.elevation}
                    </div>
                    <div className="mt-0.5 text-ink">
                      <span className="fig text-[19px]">{c.totalElevationM}</span> {T.mUnit}
                    </div>
                  </div>
                )}
              </div>

              {c.poi && (
                <a
                  href={kakaoDirectionsUrl(c.poi.name, c.poi.lat, c.poi.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-ink bg-transparent px-4 py-2 text-[12.5px] font-semibold text-ink transition duration-200 ease-ds hover:bg-ink hover:text-page"
                >
                  <Navigation className="h-3.5 w-3.5" aria-hidden /> {T.kakao}
                </a>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
