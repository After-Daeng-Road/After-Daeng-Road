// 댕로드 — TourAPI 일별 ETL Edge Function
// PRD §13.1: KorService2/areaBasedList2 (충남 4시 POI) + KorPetTourService2 (펫 동반 목록·상세)
// pg_cron 에서 매일 02:00 KST 호출
//
// ═══ 2026-09-13 재작성 — 쿼터 초과가 펫 데이터를 지우던 구조 ═══
// 이전 버전은 POI 950건마다 KorService2/detailPetTour2 를 되물었다. 일일 한도(1000)를 넘기면
// 429 를 받는데 그걸 "펫 미등록" 으로 저장해 pet_allowed 83건이 전부 false 로 덮였다.
// (시드 seed-pet-realdata.ts 는 9/5 에 고쳤지만 이 크론 함수는 그대로였다.)
//
// 지금 구조 — seed-pet-realdata.ts 와 같은 방식:
//   1) KorService2/areaBasedList2 로 기본 정보만 upsert (약 8콜). pet_* 컬럼은 건드리지 않는다
//   2) KorPetTourService2/areaBasedList2 로 "펫 동반 가능 목록" 을 받는다 (약 5콜).
//      목록에 있다는 것 자체가 pet_allowed=true 다. 상세(detailPetTour2)는 그 83건만 (약 83콜)
//   3) 상세 호출이 실패(429·5xx)하면 그 건은 건너뛴다 — 절대 false 로 덮어쓰지 않는다
// 합계 약 100콜. pet_allowed 를 false 로 바꾸는 경로는 이 함수에 없다.

// @ts-expect-error — Deno URL imports
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// @ts-expect-error — Deno global
const env = (k: string): string => Deno.env.get(k) ?? '';

const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE = env('SUPABASE_SERVICE_ROLE_KEY');
const TOUR_API_KEY = env('TOUR_API_SERVICE_KEY');
const CRON_SECRET = env('CRON_SECRET');

/**
 * pg_cron 호출인지 확인한다.
 *
 * config.toml 의 verify_jwt = false 라 플랫폼 게이트웨이가 아무것도 검사하지 않는다.
 * verify_jwt = true 로 바꾸는 것으로는 방어가 안 된다 — anon 키도 유효한 JWT 이고
 * 그 키는 웹 클라이언트 번들에 공개되어 있다. 함수 안에서 공유 시크릿을 직접 봐야 한다.
 *
 * 이 함수는 service_role 로 RLS 를 우회해 쓰고, TourAPI 일일 쿼터를 소모한다.
 * 열려 있으면 반복 호출로 쿼터를 소진시켜 다음 날 갱신을 막고 pois 를 오염시킬 수 있다.
 *
 * 시크릿 미설정 시 통과가 아니라 거부한다(fail-closed). 키 누락이 곧 구멍이 되면 안 된다.
 */
function isAuthorizedCron(req: Request): boolean {
  if (!CRON_SECRET) return false;
  const got = req.headers.get('x-cron-secret') ?? '';
  // 길이가 다르면 즉시 거부. 같으면 전체를 비교해 조기 반환으로 인한 타이밍 차이를 줄인다.
  if (got.length !== CRON_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ CRON_SECRET.charCodeAt(i);
  return diff === 0;
}

const LDONG_REGN_CD = 44; // 충청남도
const CHUNGNAM_CITIES = [
  { name: '공주', signgu: [150], sigunguCode: 33020 },
  { name: '천안', signgu: [131, 133], sigunguCode: 33040 },
  { name: '아산', signgu: [200], sigunguCode: 33050 },
  { name: '서산', signgu: [210], sigunguCode: 33150 },
];

// prisma/tourapi/transform.ts 의 CONTENT_TYPE_MAP 과 동일하게 유지한다
const CONTENT_TYPE_MAP: Record<number, string> = {
  12: 'ATTRACTION',
  14: 'ATTRACTION',
  15: 'ATTRACTION',
  25: 'TRAIL',
  28: 'ATTRACTION',
  32: 'ACCOMMODATION',
  38: 'ATTRACTION',
  39: 'RESTAURANT',
};

type TourItem = {
  contentid: string | number;
  contenttypeid: string | number;
  title: string;
  addr1?: string;
  mapx?: string | number;
  mapy?: string | number;
  firstimage?: string;
  tel?: string;
};

type PetDetail = {
  acmpyTypeCd?: string;
  acmpyPsblCpam?: string;
  acmpyNeedMtr?: string;
  etcAcmpyInfo?: string;
  relaAcdntRiskMtr?: string;
};

type EtlResult = {
  added: number;
  updated: number;
  failed: number;
  petListed: number;
  petUpdated: number;
  petSkipped: number;
};

// @ts-expect-error — Deno global
Deno.serve(async (req: Request): Promise<Response> => {
  // 인증을 가장 먼저 본다 — 메서드 검사보다 앞이어야 존재 여부조차 덜 드러난다
  if (!isAuthorizedCron(req)) return json({ error: 'Unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const startedAt = new Date().toISOString();
  const result: EtlResult = {
    added: 0,
    updated: 0,
    failed: 0,
    petListed: 0,
    petUpdated: 0,
    petSkipped: 0,
  };

  try {
    // 기존 POI 를 한 번에 받아 (source_id → id) 로 둔다. 건별 select 950회를 없앤다
    const existingBySourceId = await loadExisting(admin);

    // ─── 1) 일반 관광정보: 기본 필드만 upsert (pet_* 는 절대 건드리지 않는다) ───
    for (const city of CHUNGNAM_CITIES) {
      const items = (await Promise.all(city.signgu.map((s) => fetchList('KorService2', s)))).flat();
      for (const item of items) {
        try {
          if (!item.mapx || !item.mapy) continue;
          const sourceId = String(item.contentid);
          const lat = Number(item.mapy);
          const lng = Number(item.mapx);
          const now = new Date().toISOString();
          const base = {
            name: item.title,
            content_type_id: Number(item.contenttypeid),
            type: CONTENT_TYPE_MAP[Number(item.contenttypeid)] ?? 'ATTRACTION',
            sigungu_code: city.sigunguCode,
            address: item.addr1?.trim() || null,
            lat,
            lng,
            geohash7: geohash7(lat, lng),
            phone: item.tel?.trim() || null,
            last_synced_at: now,
            // updated_at 은 NOT NULL. 0014 가 DB 기본값을 넣었지만 UPDATE 에는 기본값이 안 먹는다
            updated_at: now,
          };

          const existingId = existingBySourceId.get(sourceId);
          if (existingId) {
            // image_urls 는 건드리지 않는다 — seed-pet-realdata 가 병합한 상세 이미지가 있다
            const { error } = await admin.from('pois').update(base).eq('id', existingId);
            if (error) throw new Error(`pois.update: ${error.message}`);
            result.updated++;
          } else {
            const { data, error } = await admin
              .from('pois')
              .insert({
                id: crypto.randomUUID(),
                source: 'TOUR_API_KOR',
                source_id: sourceId,
                image_urls: item.firstimage ? [item.firstimage] : [],
                pet_allowed: false,
                ...base,
              })
              .select('id')
              .single();
            if (error) throw new Error(`pois.insert: ${error.message}`);
            existingBySourceId.set(sourceId, data.id);
            result.added++;
          }
        } catch (e) {
          console.error('item failed', item.contentid, e);
          result.failed++;
        }
      }
    }

    // ─── 2) 펫 동반 목록 → true 로만 올린다. 상세 실패는 건너뛴다 ───
    for (const city of CHUNGNAM_CITIES) {
      let petItems: TourItem[];
      try {
        petItems = (
          await Promise.all(city.signgu.map((s) => fetchList('KorPetTourService2', s)))
        ).flat();
      } catch (e) {
        // 목록 자체가 실패하면 이 도시는 이번 회차를 건너뛴다. 기존 pet_allowed 는 그대로다
        console.error('[pet list] 실패', city.name, e);
        continue;
      }
      for (const item of petItems) {
        result.petListed++;
        const sourceId = String(item.contentid);
        const id = existingBySourceId.get(sourceId);
        if (!id) {
          // 일반 목록에 없는 펫 POI. 신규 등록 등 — 다음 날 1) 단계가 만들면 그때 붙는다
          result.petSkipped++;
          continue;
        }
        try {
          const pet = await fetchPetDetail(sourceId);
          const zone = String(pet?.acmpyTypeCd ?? '');
          const policy = pet
            ? [pet.acmpyPsblCpam, pet.acmpyNeedMtr, pet.etcAcmpyInfo]
                .map((s) => (s ?? '').trim())
                .filter(Boolean)
                .join(' / ') || null
            : null;
          const { error } = await admin
            .from('pois')
            .update({
              // 목록에 있다는 것 자체가 동반 가능. 상세가 비어도 true 를 유지한다
              pet_allowed: true,
              pet_indoor: zone ? zone.includes('실내') || zone.includes('전구역') : null,
              pet_outdoor: zone ? zone.includes('실외') || zone.includes('전구역') : null,
              pet_policy_text: policy,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);
          if (error) throw new Error(`pois.update(pet): ${error.message}`);
          result.petUpdated++;
        } catch (e) {
          // 429·5xx 등. 여기서 false 를 쓰면 쿼터 초과가 데이터 삭제가 된다 — 건너뛴다
          console.error('[pet detail] 실패, 건너뜀', sourceId, e);
          result.petSkipped++;
        }
      }
    }

    // 카테고리 배지 동기화 (웰니스/생태/두루누비)
    const { error: badgeErr } = await admin.rpc('sync_category_badges');
    if (badgeErr) console.error('[sync_category_badges] 실패', badgeErr.message);

    // ETL 로그 기록 (PRD §11 tour_api_sync_logs) — id 는 BIGSERIAL 이라 명시하지 않는다
    const partial = result.failed > 0 || result.petSkipped > 0;
    const { error: logErr } = await admin.from('tour_api_sync_logs').insert({
      dataset: 'pois.areaBasedList2+KorPetTourService2',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      count_added: result.added,
      count_updated: result.updated + result.petUpdated,
      count_removed: 0,
      status: partial ? 'partial' : 'ok',
      error_message: partial
        ? `${result.failed} items failed, ${result.petSkipped}/${result.petListed} pet skipped`
        : null,
    });
    if (logErr) console.error('[tour_api_sync_logs.insert] 실패', logErr.message);

    return json({ ok: true, ...result });
  } catch (err) {
    console.error('[tour-api-etl]', err);
    const { error: failLogErr } = await admin.from('tour_api_sync_logs').insert({
      dataset: 'pois.areaBasedList2+KorPetTourService2',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: 'failed',
      error_message: String(err),
    });
    if (failLogErr) console.error('[tour_api_sync_logs.insert] 실패', failLogErr.message);
    return json({ error: 'ETL failed' }, 500);
  }
});

// ═══════════════ DB ═══════════════

async function loadExisting(admin: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // PostgREST 기본 max_rows(1000) 를 넘어도 받도록 range 로 요청한다
  const { data, error } = await admin
    .from('pois')
    .select('id, source_id')
    .eq('source', 'TOUR_API_KOR')
    .range(0, 9999);
  if (error) throw new Error(`pois.select: ${error.message}`);
  for (const r of data ?? []) map.set(r.source_id, r.id);
  return map;
}

// ═══════════════ TourAPI 호출 ═══════════════
// 두 서비스는 contentId 체계를 공유하고 목록 응답 형태가 같다.
// 실패는 throw 한다 — 삼키면 "정보 없음" 과 구분되지 않아 false 로 덮이는 사고가 재발한다.

const BASE = 'https://apis.data.go.kr/B551011';

function buildUrl(service: string, op: string, params: Record<string, string | number>): string {
  const u = new URL(`${BASE}/${service}/${op}`);
  const all = {
    MobileOS: 'ETC',
    MobileApp: 'daengroad',
    _type: 'json',
    serviceKey: TOUR_API_KEY,
    ...params,
  };
  for (const [k, v] of Object.entries(all)) u.searchParams.set(k, String(v));
  return u.toString();
}

async function getBody(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'daengroad-etl' },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* 한도초과·서비스오류는 비JSON 이거나 OpenAPI_ServiceResponse 형태 */
  }
  const code = parsed?.response?.header?.resultCode;
  if (code !== '0000') {
    const err = parsed?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg ?? text.slice(0, 120);
    throw new Error(`TourAPI HTTP ${res.status} code=${code ?? '?'} ${err}`);
  }
  return parsed.response.body;
}

/** 정상 응답의 items 는 데이터가 없을 때 빈 문자열('')로 온다 */
function asArray<T>(item: T | T[] | undefined | ''): T[] {
  if (!item || item === '') return [];
  return Array.isArray(item) ? item : [item];
}

/** 한 시군구(법정동 3자리)의 전체 목록 — KorService2(일반) / KorPetTourService2(펫) 공용 */
async function fetchList(
  service: 'KorService2' | 'KorPetTourService2',
  signgu: number,
): Promise<TourItem[]> {
  const out: TourItem[] = [];
  const numOfRows = 100;
  for (let pageNo = 1; pageNo <= 20; pageNo++) {
    const body = await getBody(
      buildUrl(service, 'areaBasedList2', {
        numOfRows,
        pageNo,
        arrange: 'C',
        lDongRegnCd: LDONG_REGN_CD,
        lDongSignguCd: signgu,
      }),
    );
    const items = asArray<TourItem>(body?.items?.item);
    out.push(...items);
    if (out.length >= Number(body?.totalCount ?? 0) || items.length < numOfRows) break;
  }
  return out;
}

/** 펫 동반 상세. 목록에 있는 POI 라도 상세가 비어 있을 수 있어 null 을 허용한다. 호출 실패는 throw */
async function fetchPetDetail(contentId: string): Promise<PetDetail | null> {
  const body = await getBody(buildUrl('KorPetTourService2', 'detailPetTour2', { contentId }));
  const first = asArray<PetDetail>(body?.items?.item)[0];
  return first && typeof first === 'object' ? first : null;
}

// ═══════════════ 유틸 ═══════════════

function geohash7(lat: number, lng: number): string {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latR = [-90, 90];
  let lngR = [-180, 180];
  let bits = 0;
  let bit = 0;
  let evenBit = true;
  let hash = '';
  while (hash.length < 7) {
    if (evenBit) {
      const mid = (lngR[0] + lngR[1]) / 2;
      if (lng >= mid) {
        bits = (bits << 1) | 1;
        lngR = [mid, lngR[1]];
      } else {
        bits = bits << 1;
        lngR = [lngR[0], mid];
      }
    } else {
      const mid = (latR[0] + latR[1]) / 2;
      if (lat >= mid) {
        bits = (bits << 1) | 1;
        latR = [mid, latR[1]];
      } else {
        bits = bits << 1;
        latR = [latR[0], mid];
      }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      hash += BASE32[bits];
      bits = 0;
      bit = 0;
    }
  }
  return hash;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
