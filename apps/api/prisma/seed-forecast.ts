// 댕로드 — 관광지별 관광객 집중률 예측(TatsCnctrRateService)으로 30일 예측 한적도 적재.
// 실행: npm run seed:forecast          (적재)
//       npm run seed:forecast -- --dry (DB 쓰기 없이 수집·매칭만 검증)
//
// ═══ 이 스크립트가 푸는 문제 ═══
// 제안서·PRD 가 F2 의 "핵심 차별점"으로 내세운 30일 예측 한적도에 데이터를 넣는 경로가
// 없었다. poi_forecasts 테이블, Edge 의 fetchForecasts, 카드의 "내일 같은 시간 · 이번 주 평균"
// 표시까지 다 만들어져 있는데 테이블이 비어 있어 hasForecastData 가 늘 false 였다.
//
// ═══ 데이터 ═══
// KT 이동통신 데이터를 2018년부터 학습해 관광지별 향후 30일 집중률을 예측한다.
// 가장 붐비는 시기를 100 으로 본 상대값이므로 한적도는 100 - cnctrRate 로 뒤집는다.
//
// ═══ 매칭 ═══
// 응답에 contentId 도 좌표도 없어 관광지명으로만 붙일 수 있다. 정규화한 이름이 같은 시군구
// 안에서 정확히 하나일 때만 매칭한다(후보 다수면 확정하지 않음). 규칙과 근거는 forecast/transform.ts.
//
// 실측(2026-09-20): 예측 관광지 191곳 중 172곳(90.1%) 매칭, 후보 다수 1건.
// 매칭 안 된 POI(매장·펜션·카페 등 예측 대상이 아닌 곳)는 같은 날 시군구 평균으로 채우고
// confidence 로 구분한다 — 지금 한적도가 시군구 단위인 것과 같은 입도다.
//
// 멱등: (poi_id, forecast_date) 유니크에 기대어 덮어쓴다(삭제 없음). 예측은 매일 갱신되므로
// 같은 날짜의 옛 값은 갱신되고, 이번 응답에 없던 POI·날짜의 기존 예측은 그대로 남는다.
import { PrismaClient } from '@prisma/client';
import {
  SIGUNGU_FORECAST_MAP,
  buildForecastRows,
  matchSpots,
  type ForecastItem,
  type ForecastRow,
  type PoiRef,
} from './forecast/transform.ts';

const prisma = new PrismaClient();

const ENDPOINT = 'https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList';
const UA = 'Mozilla/5.0 (daengroad ETL)';
const DRY = process.argv.includes('--dry');

/** 충남 시도 행정코드 */
const AREA_CD = '44';
/** 한 시군구가 30일 × 관광지 수 행을 준다. 실측 최대 58곳 × 30일 = 1,740행 */
const NUM_OF_ROWS = '3000';
/** 일시적 실패에 대한 재시도 횟수. seed-datalab 과 같은 이유 — 한 번의 타임아웃이 전체를 죽이면 안 된다. */
const MAX_RETRY = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * API 가 요청 자체를 거절한 경우 — 재시도해도 같은 답이 온다.
 *
 * 응답 파싱 실패는 여기 넣지 않는다. 게이트웨이가 일시적으로 HTML 오류 페이지를 돌려주는
 * 일이 있어서, 그것까지 즉시 실패로 치면 잠깐의 장애가 전체 적재를 끝내버린다.
 */
class ApiRejectedError extends Error {}

type ApiResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: ForecastItem | ForecastItem[] } | ''; totalCount?: number | string };
  };
};

/**
 * 한 시군구의 30일 예측을 받는다. 타임아웃·네트워크 오류는 지수 백오프로 재시도하고,
 * API 가 명시적으로 거절한 경우(resultCode ≠ 0000)는 즉시 던진다 — 재시도해도 같다.
 */
async function fetchSigunguWithRetry(admCode: string): Promise<ForecastItem[]> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      return await fetchSigungu(admCode);
    } catch (e) {
      lastErr = e;
      if (e instanceof ApiRejectedError) throw e;
      if (attempt === MAX_RETRY) break;
      const backoff = 1000 * 2 ** (attempt - 1); // 1s → 2s → 4s
      console.log(`    ↻ ${admCode} 재시도 ${attempt}/${MAX_RETRY - 1} (${backoff}ms 후)`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

async function fetchSigungu(admCode: string): Promise<ForecastItem[]> {
  const key = process.env.TOUR_API_SERVICE_KEY;
  if (!key) throw new Error('TOUR_API_SERVICE_KEY 미설정 (apps/api/.env)');

  const u = new URL(ENDPOINT);
  // searchParams.set 이 키의 '/' '+' '=' 를 인코딩한다. 문자열로 이어붙이면 키가 깨진다
  for (const [k, v] of Object.entries({
    MobileOS: 'ETC',
    MobileApp: 'daengroad',
    _type: 'json',
    numOfRows: NUM_OF_ROWS,
    pageNo: '1',
    serviceKey: key,
    areaCd: AREA_CD,
    signguCd: admCode,
  })) {
    u.searchParams.set(k, v);
  }

  const res = await fetch(u, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text();

  let json: ApiResponse;
  try {
    json = JSON.parse(text);
  } catch {
    // 인증 실패는 XML 로, 게이트웨이 장애는 HTML 로 온다. 후자는 재시도할 값어치가 있으므로
    // 거절로 분류하지 않는다
    throw new Error(`집중률 예측 응답 파싱 실패: ${text.slice(0, 200)}`);
  }

  const code = json.response?.header?.resultCode;
  if (code !== '0000') {
    throw new ApiRejectedError(
      `집중률 예측 호출 실패 code=${code} ${json.response?.header?.resultMsg ?? ''}`,
    );
  }

  const body = json.response?.body;
  // 결과가 없으면 items 가 빈 문자열로 온다 — falsy 다
  const raw = body?.items;
  const item = raw ? raw.item : undefined;
  const list = item ? (Array.isArray(item) ? item : [item]) : [];

  // 한 페이지만 읽는다. 받은 행이 전체보다 적으면 일부 관광지·날짜가 조용히 빠진 것이고,
  // 그 불완전한 자료로 시군구 평균까지 계산된다. 요청 한도가 아니라 실제로 받은 수와 비교한다
  // — 서버가 요청보다 작은 페이지 크기를 적용할 수 있기 때문이다.
  const total = Number(body?.totalCount);
  if (Number.isFinite(total) && total > list.length) {
    throw new ApiRejectedError(
      `집중률 예측 ${admCode}: 전체 ${total}행 중 ${list.length}행만 받았습니다. 페이지 순회가 필요합니다`,
    );
  }

  return list;
}

async function main() {
  console.log(`\n관광지 집중률 30일 예측 적재${DRY ? ' (dry-run)' : ''}\n`);

  const pois: PoiRef[] = (
    await prisma.poi.findMany({
      where: { sigunguCode: { in: [...new Set(Object.values(SIGUNGU_FORECAST_MAP))] } },
      select: { id: true, name: true, sigunguCode: true },
    })
  ).flatMap((p) =>
    p.sigunguCode == null ? [] : [{ id: p.id, name: p.name, sigunguCode: p.sigunguCode }],
  );
  console.log(`  POI ${pois.length}건 로드 (충남 4시)\n`);

  // 같은 33xxx 로 모이는 시군구(천안 동남·서북)는 항목을 합쳐 한 번에 처리한다.
  // 나눠서 buildForecastRows 를 두 번 부르면 폴백 POI 가 양쪽에서 중복 생성된다.
  const itemsByCode = new Map<number, ForecastItem[]>();

  for (const [admCode, sigunguCode] of Object.entries(SIGUNGU_FORECAST_MAP)) {
    const items = await fetchSigunguWithRetry(admCode);
    const spots = new Set(items.map((i) => i.tAtsNm).filter(Boolean));
    console.log(`  ${admCode} → ${sigunguCode}: 관광지 ${spots.size}곳 · ${items.length}행`);
    const prev = itemsByCode.get(sigunguCode);
    if (prev) prev.push(...items);
    else itemsByCode.set(sigunguCode, items);
  }

  const allRows: ForecastRow[] = [];
  let totalSpots = 0;
  let totalMatched = 0;
  let totalAmbiguous = 0;

  for (const [sigunguCode, items] of itemsByCode) {
    const spotNames = [...new Set(items.map((i) => i.tAtsNm).filter(Boolean))];
    const { matched, ambiguous, missed } = matchSpots(spotNames, pois, sigunguCode);
    totalSpots += spotNames.length;
    totalMatched += matched.size;
    totalAmbiguous += ambiguous.length;

    console.log(
      `\n  [${sigunguCode}] 예측 ${spotNames.length}곳 → 매칭 ${matched.size} · 후보다수 ${ambiguous.length} · 미스 ${missed.length}`,
    );
    if (missed.length) console.log(`         미매칭: ${missed.slice(0, 6).join(' / ')}`);
    if (ambiguous.length) console.log(`         후보다수(미확정): ${ambiguous.join(' / ')}`);

    allRows.push(...buildForecastRows(items, pois, sigunguCode));
  }

  const matchedRows = allRows.filter((r) => r.confidence === 1.0).length;
  console.log(
    `\n  합계: 예측 관광지 ${totalSpots}곳 중 ${totalMatched}곳 매칭 (${((totalMatched / totalSpots) * 100).toFixed(1)}%) · 후보다수 ${totalAmbiguous}`,
  );
  console.log(
    `  생성 행 ${allRows.length} (실측 매칭 ${matchedRows} · 시군구 평균 폴백 ${allRows.length - matchedRows})`,
  );

  if (allRows.length === 0) {
    console.log('\n  적재할 행이 없습니다 — 중단');
    return;
  }

  if (DRY) {
    const sample = allRows.slice(0, 3);
    console.log('\n  dry-run — DB 쓰기 없음. 샘플:');
    for (const r of sample) {
      console.log(`    ${r.poiId} ${r.forecastDate} score=${r.expectedScore} conf=${r.confidence}`);
    }
    return;
  }

  const dates = [...new Set(allRows.map((r) => r.forecastDate))].sort();
  const now = new Date();
  const touchedPoiIds = new Set(allRows.map((r) => r.poiId));

  // 지우지 않고 덮어쓴다.
  //
  // 처음엔 "쓰려는 POI × 쓰려는 날짜"를 지우고 다시 넣었는데, 그 조건은 삽입하는 집합보다
  // 넓다. 매칭된 장소가 특정 날짜에 값이 없거나 시군구마다 응답 날짜 범위가 다르면,
  // 이번에 다시 넣지 않는 행까지 지워버린다. (poi_id, forecast_date) 유니크에 기대어
  // 덮어쓰면 삭제 자체가 없어 그 위험이 사라지고 문장 하나라 원자적이다.
  const CHUNK = 5_000;
  let written = 0;
  for (let i = 0; i < allRows.length; i += CHUNK) {
    const chunk = allRows.slice(i, i + CHUNK);
    written += await prisma.$executeRaw`
      INSERT INTO poi_forecasts (id, poi_id, forecast_date, expected_score, confidence, computed_at)
      SELECT gen_random_uuid(), t.poi_id, t.forecast_date, t.expected_score, t.confidence, ${now}
      FROM unnest(
        ${chunk.map((r) => r.poiId)}::uuid[],
        ${chunk.map((r) => r.forecastDate)}::date[],
        ${chunk.map((r) => r.expectedScore)}::int[],
        ${chunk.map((r) => r.confidence)}::numeric[]
      ) AS t(poi_id, forecast_date, expected_score, confidence)
      ON CONFLICT (poi_id, forecast_date) DO UPDATE
        SET expected_score = EXCLUDED.expected_score,
            confidence     = EXCLUDED.confidence,
            computed_at    = EXCLUDED.computed_at`;
  }

  // 지난 날짜는 아무도 읽지 않는다(Edge 는 오늘~+7일만 조회). 쌓이기만 하므로 정리한다.
  // 기준은 응답의 최소 날짜가 아니라 오늘이다 — 응답이 내일부터 시작하면 오늘 값이 지워진다.
  // 대상도 이번에 건드린 POI 로 한정해 다른 지역·다른 적재 경로의 기록을 건드리지 않는다
  const todayKst = new Date(new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10));
  const purged = await prisma.poiForecast.deleteMany({
    where: { poiId: { in: [...touchedPoiIds] }, forecastDate: { lt: todayKst } },
  });

  console.log(
    `\n  ✓ poi_forecasts ${written}행 반영 (${dates[0]} ~ ${dates[dates.length - 1]}, POI ${touchedPoiIds.size}건)`,
  );
  if (purged.count > 0) console.log(`    지난 날짜 ${purged.count}행 정리`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
