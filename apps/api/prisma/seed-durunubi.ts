// 댕로드 — 두루누비 정보 서비스(DurunubiService) 코스 적재.
// 실행: npm run seed:durunubi          (적재)
//       npm run seed:durunubi -- --dry (DB 쓰기 없이 수집·파싱만 검증)
//
// 배경:
//   두루누비는 한국관광공사가 운영하는 걷기길 통합 플랫폼이고, PRD §6.6 이 F6 산책로의
//   1차 데이터로 지정했다. API 는 노선(routeList, 4건)과 코스(courseList, 142건)를 나눠 준다.
//   - routeIdx: 남파랑길·서해랑길·DMZ 평화의 길·해파랑길 4개
//   - crsIdx  : 실제 코스 142개  ← 적재 단위
//
//   충남 4개 시(공주·천안·아산·서산) 해당 코스는 서산 3건뿐이다. 그래도 142건 전부 적재한다.
//   행이 142개라 저장 비용이 사실상 없고, 지역 확장 시 재적재 없이 바로 쓸 수 있으며,
//   두루누비 전량 연동이라는 데이터 활용 근거가 된다.
//
// 좌표:
//   courseList 응답에는 좌표가 없다. gpxpath 로 GPX 파일을 받아 첫 좌표를 시작점으로 삼고,
//   경로는 약 100 포인트로 솎아 pathGeoJson 에 넣는다. 원본은 코스당 약 200KB 라 그대로 넣지 않는다.
//
// 멱등: crsIdx / (source, sourceId) 유니크 기준 upsert. 재실행해도 결과가 같다.
import { PrismaClient, Prisma } from '@prisma/client';
import { geohash7 } from './tourapi/transform.ts';

const prisma = new PrismaClient();

const BASE = 'https://apis.data.go.kr/B551011/Durunubi';
const UA = 'Mozilla/5.0 (daengroad ETL)';
const DRY = process.argv.includes('--dry');

// GPX 를 받아올 때 동시 요청 수. durunubi.kr 는 공공데이터포털이 아니라 원본 사이트라
// 쿼터는 없지만 예의상 낮게 잡는다.
const GPX_CONCURRENCY = 4;
// pathGeoJson 에 남길 최대 좌표 수. 원본은 코스당 수천 점이다.
const PATH_MAX_POINTS = 100;

// sigun 원문("충남 서산시") → 프로젝트 sigunguCode.
// 서비스 지역 밖 코스는 null 로 두어 지역 통계에 섞이지 않게 한다.
const SIGUNGU_BY_NAME: Record<string, number> = {
  '충남 공주시': 33020,
  '충남 천안시': 33040,
  '충남 아산시': 33050,
  '충남 서산시': 33150,
};

type RouteItem = { routeIdx?: string; themeNm?: string; brdDiv?: string };
type CourseItem = {
  routeIdx?: string;
  crsIdx?: string;
  crsKorNm?: string;
  crsDstnc?: string;
  crsTotlRqrmHour?: string;
  crsLevel?: string;
  crsContents?: string;
  crsSummary?: string;
  sigun?: string;
  gpxpath?: string;
};

// ═══════════════ API ═══════════════

function requireKey(): string {
  const k = process.env.TOUR_API_SERVICE_KEY;
  if (!k) throw new Error('TOUR_API_SERVICE_KEY 미설정 (apps/api/.env)');
  return k;
}

async function fetchList<T>(op: string): Promise<T[]> {
  const u = new URL(`${BASE}/${op}`);
  const params: Record<string, string> = {
    MobileOS: 'ETC',
    MobileApp: 'daengroad',
    _type: 'json',
    numOfRows: '500',
    pageNo: '1',
    serviceKey: requireKey(),
  };
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);

  const res = await fetch(u, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 비JSON 에러 응답 */
  }
  const code = json?.response?.header?.resultCode ?? json?.resultCode;
  if (code !== '0000') {
    // 실패를 빈 배열로 뭉개지 않는다 — 조용히 0건 적재되는 사고를 막는다
    throw new Error(`두루누비 ${op} 실패: code=${code ?? '?'} ${text.slice(0, 200)}`);
  }
  const item = json?.response?.body?.items?.item;
  return !item ? [] : Array.isArray(item) ? item : [item];
}

// ═══════════════ GPX ═══════════════

type Path = { start: { lat: number; lng: number }; points: [number, number][] };

/** GPX 본문에서 좌표를 뽑아 시작점과 솎아낸 경로를 만든다. trkpt/rtept/wpt 순으로 시도. */
export function parseGpx(xml: string): Path | null {
  const pts: [number, number][] = [];
  const re = /<(?:trkpt|rtept|wpt)\b[^>]*?lat="([-\d.]+)"[^>]*?lon="([-\d.]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    // 한반도 범위를 크게 벗어난 좌표는 파싱 오류로 본다
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < 32 || lat > 39.5 || lng < 124 || lng > 132) continue;
    pts.push([lng, lat]); // GeoJSON 은 [lng, lat] 순서
  }
  if (pts.length === 0) return null;

  const step = Math.max(1, Math.ceil(pts.length / PATH_MAX_POINTS));
  const thinned = pts.filter((_, i) => i % step === 0);
  // 마지막 점은 항상 남겨 경로 끝이 잘리지 않게 한다
  const last = pts[pts.length - 1];
  if (thinned[thinned.length - 1] !== last) thinned.push(last);

  return { start: { lat: pts[0][1], lng: pts[0][0] }, points: thinned };
}

async function fetchGpx(url: string): Promise<Path | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    return parseGpx(await res.text());
  } catch {
    return null;
  }
}

// ═══════════════ 변환 ═══════════════

function toInt(v: string | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toDecimal(v: string | undefined): Prisma.Decimal {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return new Prisma.Decimal(Number.isFinite(n) ? n : 0);
}

/** HTML 태그와 개행 표기를 걷어낸 설명문. crsSummary 우선, 없으면 crsContents. */
function description(c: CourseItem): string | null {
  const raw = c.crsSummary || c.crsContents || '';
  const text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > 0 ? text : null;
}

// ═══════════════ 적재 ═══════════════

type Stats = { courses: number; pois: number; noGpx: number; failed: number; inService: number };

async function upsertOne(
  c: CourseItem,
  themeByRoute: Map<string, string>,
  path: Path | null,
  now: Date,
  s: Stats,
): Promise<void> {
  const crsIdx = c.crsIdx;
  if (!crsIdx) {
    s.failed++;
    return;
  }
  if (!path) {
    // 좌표가 없으면 POI 를 만들 수 없다. 코스 행도 만들지 않는다 —
    // poi_id 가 비면 배지도 상세 칩도 붙지 않아 반쪽짜리 행만 남는다.
    s.noGpx++;
    console.log(`  ⚠ 좌표 없음, 건너뜀: ${c.crsKorNm} (${crsIdx})`);
    return;
  }

  const sigun = c.sigun?.trim() || null;
  const sigunguCode = sigun ? (SIGUNGU_BY_NAME[sigun] ?? null) : null;
  if (sigunguCode !== null) s.inService++;

  const name = c.crsKorNm?.trim() || `두루누비 코스 ${crsIdx}`;
  const { lat, lng } = path.start;

  if (DRY) {
    s.courses++;
    s.pois++;
    return;
  }

  // POI — 코스 시작점을 대표 좌표로 삼는다
  const poi = await prisma.poi.upsert({
    where: { source_sourceId: { source: 'DURUNUBI', sourceId: crsIdx } },
    create: {
      source: 'DURUNUBI',
      sourceId: crsIdx,
      name,
      type: 'TRAIL',
      sigunguCode,
      address: sigun,
      lat,
      lng,
      geohash7: geohash7(lat, lng),
      imageUrls: [],
      intro: description(c),
      // 공식 펫 등록(TourAPI 반려동물 동반여행)이 아니므로 false 를 유지한다.
      // 야외 걷기길이라 사실상 동반이 자유롭지만, 검증되지 않은 것을 true 로 두지 않는다.
      petAllowed: false,
      lastSyncedAt: now,
    },
    update: {
      name,
      sigunguCode,
      address: sigun,
      lat,
      lng,
      geohash7: geohash7(lat, lng),
      intro: description(c),
      lastSyncedAt: now,
    },
    select: { id: true },
  });
  s.pois++;

  const courseData = {
    routeIdx: c.routeIdx ?? '',
    crsName: name,
    themeName: c.routeIdx ? (themeByRoute.get(c.routeIdx) ?? null) : null,
    sigunText: sigun,
    totalDistanceKm: toDecimal(c.crsDstnc),
    estimatedMin: toInt(c.crsTotlRqrmHour),
    difficultyLevel: toInt(c.crsLevel),
    gpxPath: c.gpxpath ?? null,
    pathGeoJson: { type: 'LineString', coordinates: path.points } as Prisma.InputJsonValue,
    description: description(c),
    lastSyncedAt: now,
  };

  await prisma.durunubiCourse.upsert({
    where: { crsIdx },
    create: { crsIdx, poiId: poi.id, imageUrls: [], ...courseData },
    update: { poiId: poi.id, ...courseData },
  });
  s.courses++;
}

/** 동시 실행 수를 제한하며 전부 처리한다. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  console.log(DRY ? '🔍 두루누비 수집 검증 (DB 쓰기 없음)' : '🌱 두루누비 코스 적재');

  const routes = await fetchList<RouteItem>('routeList');
  const themeByRoute = new Map<string, string>();
  for (const r of routes) if (r.routeIdx && r.themeNm) themeByRoute.set(r.routeIdx, r.themeNm);
  console.log(`  노선 ${routes.length}건: ${[...themeByRoute.values()].join(', ')}`);

  const courses = await fetchList<CourseItem>('courseList');
  console.log(`  코스 ${courses.length}건 — GPX 좌표 수집 시작 (동시 ${GPX_CONCURRENCY})`);

  const paths = await mapLimit(courses, GPX_CONCURRENCY, async (c, i) => {
    const p = c.gpxpath ? await fetchGpx(c.gpxpath) : null;
    if ((i + 1) % 25 === 0) console.log(`    ... ${i + 1}/${courses.length}`);
    return p;
  });

  const now = new Date();
  const s: Stats = { courses: 0, pois: 0, noGpx: 0, failed: 0, inService: 0 };
  for (let i = 0; i < courses.length; i++) {
    try {
      await upsertOne(courses[i], themeByRoute, paths[i], now, s);
    } catch (e) {
      s.failed++;
      console.error(`  ✗ ${courses[i].crsKorNm}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(
    `\n  ✓ 코스 ${s.courses} · POI ${s.pois} · 서비스지역(충남4시) ${s.inService} · 좌표없음 ${s.noGpx} · 실패 ${s.failed}`,
  );

  if (!DRY && s.courses > 0) {
    // 두루누비 공식 코스 배지(TRAIL_OFFICIAL) 부여 — poi_id 가 채워진 행이 대상 (0003)
    const granted = await prisma.$queryRawUnsafe<Array<{ sync_category_badges: number }>>(
      'SELECT sync_category_badges()',
    );
    console.log(`  ✓ 카테고리 배지 동기화: ${granted[0]?.sync_category_badges ?? 0}건`);
  }

  if (s.failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
