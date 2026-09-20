// 댕로드 — 관광지 집중률 30일 예측 일별 갱신 Edge Function
// PRD §13.1.4 / F2: TatsCnctrRateService/tatsCnctrRatedList (충남 4시)
// pg_cron 에서 매일 02:30 KST 호출 (tour-api-etl 02:00 다음 — POI 가 갱신된 뒤 매칭해야 한다)
//
// 수집·매칭·행 생성 규칙은 prisma/seed-forecast.ts 와 같다. 매칭 규칙은 두 벌로 두면
// 반드시 어긋나므로 _shared/forecast-transform.ts 한 벌을 Node 시드와 함께 쓴다.
// 그 모듈의 테스트는 prisma/forecast/transform.test.ts (npm test, apps/api).
//
// 예측값은 매일 바뀌고 창이 하루씩 밀린다. (poi_id, forecast_date) 유니크에 기대어 덮어쓰고,
// 지난 날짜는 정리한다. 삭제 후 삽입을 하지 않는 이유는 seed-forecast.ts 주석 참고.

// @ts-expect-error — Deno URL imports
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  SIGUNGU_FORECAST_MAP,
  buildForecastRows,
  matchSpots,
  type ForecastItem,
  type ForecastRow,
  type PoiRef,
} from '../_shared/forecast-transform.ts';

// @ts-expect-error — Deno global
const env = (k: string): string => Deno.env.get(k) ?? '';

const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE = env('SUPABASE_SERVICE_ROLE_KEY');
const TOUR_API_KEY = env('TOUR_API_SERVICE_KEY');
const CRON_SECRET = env('CRON_SECRET');

const ENDPOINT = 'https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList';
const AREA_CD = '44';
const NUM_OF_ROWS = '3000';
const MAX_RETRY = 3;
/** 한 번에 upsert 할 행 수. 28,800행을 통째로 보내면 요청이 지나치게 커진다 */
const CHUNK = 2_000;

/**
 * pg_cron 호출인지 확인한다. 근거는 tour-api-etl 의 같은 함수 주석 참고 —
 * verify_jwt 로는 막을 수 없고(anon 키는 공개), 시크릿 미설정 시 fail-closed 여야 한다.
 */
function isAuthorizedCron(req: Request): boolean {
  if (!CRON_SECRET) return false;
  const got = req.headers.get('x-cron-secret') ?? '';
  if (got.length !== CRON_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ CRON_SECRET.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** API 가 요청 자체를 거절한 경우 — 재시도해도 같다. 파싱 실패는 여기 넣지 않는다 */
class ApiRejectedError extends Error {}

type ApiResponse = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: ForecastItem | ForecastItem[] } | ''; totalCount?: number | string };
  };
};

async function fetchSigunguWithRetry(admCode: string): Promise<ForecastItem[]> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      return await fetchSigungu(admCode);
    } catch (e) {
      lastErr = e;
      if (e instanceof ApiRejectedError) throw e;
      if (attempt === MAX_RETRY) break;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastErr;
}

async function fetchSigungu(admCode: string): Promise<ForecastItem[]> {
  if (!TOUR_API_KEY) throw new ApiRejectedError('TOUR_API_SERVICE_KEY 미설정 (Edge 시크릿)');

  const u = new URL(ENDPOINT);
  // searchParams.set 이 키의 '/' '+' '=' 를 인코딩한다. 문자열로 이어붙이면 키가 깨진다
  for (const [k, v] of Object.entries({
    MobileOS: 'ETC',
    MobileApp: 'daengroad',
    _type: 'json',
    numOfRows: NUM_OF_ROWS,
    pageNo: '1',
    serviceKey: TOUR_API_KEY,
    areaCd: AREA_CD,
    signguCd: admCode,
  })) {
    u.searchParams.set(k, v);
  }

  const res = await fetch(u, { signal: AbortSignal.timeout(45_000) });
  const text = await res.text();

  let parsed: ApiResponse;
  try {
    parsed = JSON.parse(text);
  } catch {
    // 인증 실패는 XML, 게이트웨이 장애는 HTML 로 온다. 후자는 재시도할 값어치가 있다
    throw new Error(`집중률 예측 응답 파싱 실패: ${text.slice(0, 200)}`);
  }

  const code = parsed.response?.header?.resultCode;
  if (code !== '0000') {
    throw new ApiRejectedError(
      `집중률 예측 호출 실패 code=${code} ${parsed.response?.header?.resultMsg ?? ''}`,
    );
  }

  const body = parsed.response?.body;
  const raw = body?.items;
  const item = raw ? raw.item : undefined;
  const list = item ? (Array.isArray(item) ? item : [item]) : [];

  // 받은 행이 전체보다 적으면 일부가 조용히 빠진 것이고 시군구 평균까지 편향된다
  const total = Number(body?.totalCount);
  if (Number.isFinite(total) && total > list.length) {
    throw new ApiRejectedError(
      `집중률 예측 ${admCode}: 전체 ${total}행 중 ${list.length}행만 받았습니다. 페이지 순회가 필요합니다`,
    );
  }

  return list;
}

/**
 * 대상 시군구의 POI 를 전부 읽는다 — 페이지를 반드시 순회한다.
 *
 * PostgREST 는 한 응답의 행 수에 상한이 있고(기본 1000), 넘으면 오류가 아니라 조용히 잘린다.
 * 지금 충남 4시가 960건이고 tour-api-etl 이 매일 POI 를 더한다. 잘리면 누락된 POI 의 예측이
 * 갱신되지 않을 뿐 아니라, 동명 POI 가 경계에서 갈리면 "후보 하나"로 보여 엉뚱한 곳에
 * 예측을 붙인다 — 매칭이 기대는 전제가 무너진다.
 */
const POI_PAGE = 1_000;

async function loadPois(admin: SupabaseClient): Promise<PoiRef[]> {
  const codes = [...new Set(Object.values(SIGUNGU_FORECAST_MAP))];
  const out: PoiRef[] = [];

  for (let from = 0; ; from += POI_PAGE) {
    const { data, error } = await admin
      .from('pois')
      .select('id, name, sigungu_code')
      .in('sigungu_code', codes)
      .order('id', { ascending: true }) // 페이지 간 순서 고정 — 없으면 누락·중복이 난다
      .range(from, from + POI_PAGE - 1);
    if (error) throw new Error(`pois 조회 실패: ${error.message}`);

    const page = data ?? [];
    for (const p of page as { id: string; name: string; sigungu_code: number | null }[]) {
      if (p.sigungu_code != null) {
        out.push({ id: p.id, name: p.name, sigunguCode: p.sigungu_code });
      }
    }
    if (page.length < POI_PAGE) break;
  }

  return out;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // 인증을 가장 먼저 본다 — 메서드 검사보다 앞이어야 존재 여부조차 덜 드러난다
  if (!isAuthorizedCron(req)) return json({ error: 'Unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });
  const startedAt = new Date().toISOString();

  try {
    const pois = await loadPois(admin);

    // 같은 33xxx 로 모이는 시군구(천안 동남·서북)는 항목을 합쳐 한 번에 처리한다.
    // 나눠서 buildForecastRows 를 두 번 부르면 폴백 POI 가 양쪽에서 중복 생성된다
    const itemsByCode = new Map<number, ForecastItem[]>();
    // 어떤 시군구가 성공 코드와 함께 빈 목록을 주면, 그 지역 POI 는 행을 하나도 못 받는다.
    // 다른 지역에서 행이 생기면 전체 0건 검사를 통과하므로 여기서 따로 붙잡는다
    const emptyAdmCodes: string[] = [];
    for (const [admCode, sigunguCode] of Object.entries(SIGUNGU_FORECAST_MAP)) {
      const items = await fetchSigunguWithRetry(admCode);
      if (items.length === 0) emptyAdmCodes.push(admCode);
      const prev = itemsByCode.get(sigunguCode);
      if (prev) prev.push(...items);
      else itemsByCode.set(sigunguCode, items);
    }
    // 같은 33xxx 로 합쳐진 뒤에도 비어 있는 코드 — 그 지역은 이번에 갱신되지 않았다
    const emptySigungu = [...itemsByCode].filter(([, v]) => v.length === 0).map(([k]) => k);

    const allRows: ForecastRow[] = [];
    let spots = 0;
    let matchedSpots = 0;
    let ambiguousSpots = 0;
    for (const [sigunguCode, items] of itemsByCode) {
      const names = [...new Set(items.map((i) => i.tAtsNm).filter(Boolean))];
      const m = matchSpots(names, pois, sigunguCode);
      spots += names.length;
      matchedSpots += m.matched.size;
      ambiguousSpots += m.ambiguous.length;
      allRows.push(...buildForecastRows(items, pois, sigunguCode));
    }

    if (allRows.length === 0) {
      await admin.from('tour_api_sync_logs').insert({
        dataset: 'poi_forecasts.tatsCnctrRatedList',
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        count_added: 0,
        count_updated: 0,
        count_removed: 0,
        status: 'failed',
        error_message: '예측 항목 0건',
      });
      return json({ error: '예측 항목 0건' }, 500);
    }

    // (poi_id, forecast_date) 유니크에 기대어 덮어쓴다. 삭제가 없어 실패해도 기존 값이 남는다.
    // id 는 넣지 않는다 — 0022 에서 DB 기본값을 줬다. 페이로드에 넣으면 갱신 때 기본키까지 바뀐다
    const computedAt = new Date().toISOString();
    let written = 0;
    for (let i = 0; i < allRows.length; i += CHUNK) {
      const chunk = allRows.slice(i, i + CHUNK);
      const { error } = await admin.from('poi_forecasts').upsert(
        chunk.map((r) => ({
          poi_id: r.poiId,
          forecast_date: r.forecastDate,
          expected_score: r.expectedScore,
          confidence: r.confidence,
          computed_at: computedAt,
        })),
        { onConflict: 'poi_id,forecast_date' },
      );
      if (error) throw new Error(`poi_forecasts upsert 실패: ${error.message}`);
      written += chunk.length;
    }

    // 지난 날짜는 아무도 읽지 않는다(Edge 추천은 오늘~+7일만 조회). 쌓이기만 하므로 정리한다
    const todayKst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const touchedPoiIds = [...new Set(allRows.map((r) => r.poiId))];
    // id 를 한 요청에 다 넣으면 URL 이 수만 자가 되어 프록시 길이 제한에 걸린다(UUID 1건당 약 37자).
    // 100건씩 나눠 보내고, 실패는 콘솔이 아니라 실행 상태에 반영한다
    const PURGE_CHUNK = 100;
    let purgeFailed = false;
    for (let i = 0; i < touchedPoiIds.length; i += PURGE_CHUNK) {
      const { error: purgeErr } = await admin
        .from('poi_forecasts')
        .delete()
        .in('poi_id', touchedPoiIds.slice(i, i + PURGE_CHUNK))
        .lt('forecast_date', todayKst);
      if (purgeErr) {
        console.error('[poi_forecasts.purge] 실패', purgeErr.message);
        purgeFailed = true;
      }
    }

    const matchedRows = allRows.filter((r) => r.confidence === 1.0).length;
    // 매칭률이 크게 떨어지면 관광공사 표기가 바뀐 것이다 — 로그에 남겨 알아차릴 수 있게 한다
    const lowMatch = spots > 0 && matchedSpots / spots < 0.7;
    const reasons = [
      // 행정구역 단위로 본다. 천안처럼 두 구가 한 시군구로 합쳐지는 경우 한쪽만 비어도
      // 합친 결과에는 데이터가 있어 emptySigungu 로는 안 걸린다 — 그 지역 평균은 반쪽이다
      emptyAdmCodes.length > 0 ? `빈 행정구역: ${emptyAdmCodes.join(',')}` : null,
      emptySigungu.length > 0 ? `빈 시군구: ${emptySigungu.join(',')}` : null,
      lowMatch ? `매칭률 저하: ${matchedSpots}/${spots}` : null,
      purgeFailed ? '지난 날짜 정리 실패' : null,
    ].filter(Boolean);

    const { error: logErr } = await admin.from('tour_api_sync_logs').insert({
      dataset: 'poi_forecasts.tatsCnctrRatedList',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      count_added: matchedRows,
      count_updated: written - matchedRows,
      count_removed: 0,
      status: reasons.length > 0 ? 'partial' : 'ok',
      error_message: reasons.length > 0 ? reasons.join(' · ') : null,
    });
    if (logErr) console.error('[tour_api_sync_logs.insert] 실패', logErr.message);

    return json({
      ok: true,
      spots,
      matchedSpots,
      ambiguousSpots,
      written,
      matchedRows,
      fallbackRows: written - matchedRows,
      emptyAdmCodes,
      emptySigungu,
      purgeFailed,
      poiCount: pois.length,
    });
  } catch (err) {
    console.error('[forecast-etl]', err);
    const { error: failLogErr } = await admin.from('tour_api_sync_logs').insert({
      dataset: 'poi_forecasts.tatsCnctrRatedList',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      count_added: 0,
      count_updated: 0,
      count_removed: 0,
      status: 'failed',
      error_message: String(err),
    });
    if (failLogErr) console.error('[tour_api_sync_logs.insert] 실패', failLogErr.message);
    return json({ error: 'forecast ETL failed' }, 500);
  }
});
