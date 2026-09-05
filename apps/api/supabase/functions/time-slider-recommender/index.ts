// 댕로드 — F1 시간슬라이더 추천 Edge Function
// PRD §12.2 알고리즘 / §13.2 endpoint 매핑 / §13.5 비용 통제(Upstash 24h ETA 캐시)
// 런타임: Supabase Edge Functions (Deno)
// ORM: Edge에서는 Prisma ✗ → @supabase/supabase-js + raw SQL (PRD §10.2)

// @ts-expect-error — Deno URL imports는 Node TS 검사기에서 미인식
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-expect-error — Deno URL imports는 Node TS 검사기에서 미인식
import { jwtVerify } from 'https://esm.sh/jose@6.2.3';

// ═══════════════ 타입 ═══════════════

type Coord = { lat: number; lng: number };

type RecommendInput = {
  petId?: string;
  timeHours: number; // 1~6
  startAt?: string; // ISO
  departure: Coord | { address: string };
};

type ReasonChip = {
  distanceKm: number;
  etaMin: number;
  quietnessNow: number;
  quietnessForecast: number;
  quietnessWeekAvg: number;
  verifiedCount: number;
};

type Recommendation = {
  poiId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  sourceLabel: string;
  type: string;
  imageUrl: string | null;
  badges: string[];
  petAllowed: boolean;
  reason: ReasonChip;
  sampleSufficient: boolean;
};

type PoiCandidate = {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address: string | null;
  image_urls: string[] | null;
  pet_policy_text: string | null;
  is_wellness: boolean;
  is_eco: boolean;
  pet_allowed: boolean;
  sigungu_code: number;
  content_type_id: number | null;
};

// ═══════════════ 환경 변수 ═══════════════

// @ts-expect-error — Deno global
const env = (k: string): string => Deno.env.get(k) ?? '';

const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE = env('SUPABASE_SERVICE_ROLE_KEY');
// 주의: Edge 는 SUPABASE_ 접두사 env 를 예약어로 막음 → 이름은 SB_JWT_SECRET (값 = Supabase JWT Secret)
const SB_JWT_SECRET = env('SB_JWT_SECRET'); // Auth.js 발급 토큰 검증용 (web 과 공유)
const JWT_KEY = new TextEncoder().encode(SB_JWT_SECRET);
const KAKAO_REST_KEY = env('KAKAO_REST_API_KEY');
const UPSTASH_URL = env('UPSTASH_REDIS_REST_URL');
const UPSTASH_TOKEN = env('UPSTASH_REDIS_REST_TOKEN');
const UPSTASH_ON = !!(UPSTASH_URL && UPSTASH_TOKEN); // 미설정 시 캐시/레이트리밋 fail-open

// ═══════════════ 상수 ═══════════════

const ETA_TTL_SEC = 24 * 60 * 60; // PRD §13.5
const RATE_LIMIT_WINDOW_SEC = 60; // PRD §10.1: 분당 30회
const RATE_LIMIT_MAX = 30;
const AVG_SPEED_KMH = 50; // 1차 휴리스틱 (PRD §12.2)
const TOP_N = 3;
const MAX_CANDIDATES = 30;
// 펫 공식 등록(TourAPI 반려동물 동반여행) 가산점. 총점 만점 1.0 기준 → 한적도 25점과 동등.
// 무조건 우선이 아니라 가산점인 이유: 충남 펫 등록 83곳 중 71곳이 쇼핑(올리브영 등)이라
// 절대 우선하면 공원·호수가 영원히 밀린다 (천안은 펫 등록 48곳이 전부 매장).
const PET_BONUS = 0.1;
// 펫 미등록이라도 반려동물 산책이 사실상 자유로운 야외 장소.
// type 으로 거르면 안 된다 — transform 이 쇼핑(38)·문화시설(14)·축제(15)를 모두
// ATTRACTION 으로 뭉개서, ATTRACTION 568건 중 192건이 실내이거나 기간한정이다.
// contentTypeId 로 관광지(12)·레포츠(28)만 취한다.
// 여행코스(25)는 제외 — 24건 중 23건이 주소가 없고, 이름이 장소가 아니라 코스 설명문이다
// ("곰 여인의 전설이 강물 되어 흐르네"). 여러 지점을 묶은 코스라 단일 좌표도 의미가 약하다.
// 산책 코스는 두루누비 연동 후 durunubi_courses 로 제대로 채운다.
const OUTDOOR_CONTENT_TYPES = [12, 28];
// 쇼핑(38)은 펫 공식 등록이라도 추천에서 뺀다. 충남 펫 등록 83곳 중 71곳이 올리브영·
// 하이마트 같은 체인 매장이고, 시내에 있어 거리 점수까지 유리해 상위를 독식한다.
// "퇴근 후 한적한 펫 외출"과 맞지 않는다. DB 에는 그대로 두고 추천에서만 제외한다.
const SHOPPING_CONTENT_TYPE = 38;
// 거리 정렬 전에 받아둘 후보 풀. 박스 쿼리는 순서 보장이 없어 limit 을 바로 걸면
// 반경 안에서 아무 30건이나 잡히고 가까운 곳이 통째로 누락된다.
const CANDIDATE_POOL = 300;

// PRD §14: CORS origin 화이트리스트 — production 도메인 + localhost
const ALLOWED_ORIGINS = new Set([
  'https://daengroad.app',
  'https://www.daengroad.app',
  'http://localhost:3000',
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://daengroad.app';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

// ═══════════════ 인증 — Supabase 호환 JWT 로컬 검증 ═══════════════

// Auth.js(apps/web/auth.ts)가 SB_JWT_SECRET(=Supabase JWT Secret)으로 서명한 access token 을 검증.
// GoTrue getUser() 미사용 이유: 유저 정본이 public.users(Prisma)라 auth.users 에 없음 → getUser 는 항상 실패.
// sub = public.users.id → recommendations.user_id FK 대상. anon/service_role 키는 role 불일치로 거부.
async function verifyUserToken(authHeader: string | null): Promise<string | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_KEY, { algorithms: ['HS256'] });
    if (payload.role !== 'authenticated') return null; // anon/service 키 차단
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

// ═══════════════ 핸들러 ═══════════════

// @ts-expect-error — Deno global
Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);
  const j = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  // 1. 사용자 인증 — Auth.js 가 발급한 Supabase 호환 JWT 를 로컬 검증 (PRD §10.2)
  const userId = await verifyUserToken(req.headers.get('Authorization'));
  if (!userId) return j({ error: 'Unauthorized' }, 401);

  // 2. Rate Limit (PRD §13.5)
  const allowed = await checkRateLimit(userId);
  if (!allowed) return j({ error: 'Too many requests' }, 429);

  // 3. 입력 파싱 / 검증
  let input: RecommendInput;
  try {
    input = await req.json();
  } catch {
    return j({ error: 'Invalid JSON' }, 400);
  }
  const v = validateInput(input);
  if (!v.ok) return j({ error: v.error }, 400);

  // 4. Service Role 클라이언트 (RLS 우회 — 서버 측 추천 알고리즘)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  try {
    const startAt = input.startAt ? new Date(input.startAt) : new Date();
    const origin = await resolveDeparture(input.departure);
    const radiusKm = (input.timeHours / 2) * AVG_SPEED_KMH;

    // ─ 후보 POI (geohash + petAllowed 인덱스 사용) ─
    const candidates = await fetchPoiCandidates(admin, origin, radiusKm);
    if (candidates.length === 0) return j({ recommendations: [] });

    // ─ ETA + 한적도 + 검증 수 조회 (배치: POI별 개별쿼리 대신 slice 전체를 몇 개 쿼리로) ─
    const slice = candidates.slice(0, MAX_CANDIDATES);
    const poiIds = slice.map((p) => p.id);
    const sigungus = [...new Set(slice.map((p) => p.sigungu_code))];
    const weekday = startAt.getDay();
    const hourSlot = startAt.getHours();

    const [verifiedMap, quietnessBySigungu, forecastsByPoi, etas] = await Promise.all([
      fetchVerifiedCounts(admin, poiIds), // 1 query
      fetchQuietnessNow(admin, sigungus, weekday, hourSlot), // 1 query
      fetchForecasts(admin, poiIds, startAt), // 1 query
      Promise.all(slice.map((poi) => getEtaCached(origin, poi))), // haversine 폴백, DB 조회 없음
    ]);

    const enriched = slice.map((poi, i) => ({
      poi,
      eta: etas[i],
      quietness: computeQuietness(
        poi,
        quietnessBySigungu,
        forecastsByPoi.get(poi.id) ?? [],
        startAt,
      ),
      verifiedCount: verifiedMap.get(poi.id) ?? 0,
    }));

    // ─ 시간 예산(왕복 = timeHours/2 시간 = 분) 안에 들어오는 것만 ─
    const budgetMin = (input.timeHours / 2) * 60;
    const inBudget = enriched.filter((e) => e.eta.minutes <= budgetMin);
    if (inBudget.length === 0) return j({ recommendations: [] });

    // ─ 점수 (PRD §12.2): 0.4*quietness + 0.3*verification + 0.2*dist_inv + 0.1*weather ─
    const maxDist = Math.max(...inBudget.map((e) => e.eta.distanceKm), 1);
    const scored = inBudget
      .map((e) => {
        const verifNorm = Math.min(e.verifiedCount / 10, 1);
        const distInverse = 1 - e.eta.distanceKm / maxDist;
        const weatherIndoor = e.poi.type === 'CAFE' || e.poi.type === 'RESTAURANT' ? 0.7 : 0.3;
        // 카테고리 가산점 (PRD §6.2 웰니스/생태 +5)
        const categoryBonus = (e.poi.is_wellness ? 5 : 0) + (e.poi.is_eco ? 5 : 0);
        const quietnessAdj = Math.min(100, e.quietness.now + categoryBonus);
        // PRD §12.2 가중치는 불변. 펫 가산점은 한적도를 왜곡하지 않도록 총점에 더한다.
        const score =
          0.4 * (quietnessAdj / 100) +
          0.3 * verifNorm +
          0.2 * distInverse +
          0.1 * weatherIndoor +
          (e.poi.pet_allowed ? PET_BONUS : 0);
        return { ...e, score, quietnessAdj };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N);

    // ─ 배지 일괄 조회 ─
    const topPoiIds = scored.map((s) => s.poi.id);
    const badgesByPoi = await fetchBadges(admin, topPoiIds);

    const recommendations: Recommendation[] = scored.map((s) => ({
      poiId: s.poi.id,
      name: s.poi.name,
      address: s.poi.address ?? '',
      lat: s.poi.lat,
      lng: s.poi.lng,
      // 두루누비는 아직 미연동 → TRAIL 도 '한적한 산책지'. 연동 시 코스 라벨 부활.
      sourceLabel: s.poi.pet_allowed ? '펫 동반 가능' : '한적한 산책지',
      type: s.poi.type,
      imageUrl: s.poi.image_urls?.[0] ?? null,
      badges: badgesByPoi.get(s.poi.id) ?? [],
      petAllowed: s.poi.pet_allowed,
      sampleSufficient: s.quietness.sampleSufficient,
      reason: {
        distanceKm: round1(s.eta.distanceKm),
        etaMin: Math.round(s.eta.minutes),
        quietnessNow: Math.round(s.quietnessAdj),
        quietnessForecast: Math.round(s.quietness.forecastTomorrow),
        quietnessWeekAvg: Math.round(s.quietness.weekAvg),
        verifiedCount: s.verifiedCount,
      },
    }));

    // ─ 영속화 (PRD: recommendations 테이블) ─
    await admin.from('recommendations').insert({
      user_id: userId,
      pet_id: input.petId ?? null,
      status: 'COMPLETED',
      departure_lat: origin.lat,
      departure_lng: origin.lng,
      departure_geohash7: geohash7(origin.lat, origin.lng),
      time_hours: input.timeHours,
      start_at: startAt.toISOString(),
      results_json: recommendations,
      reason_chips: recommendations.map((r) => r.reason),
      completed_at: new Date().toISOString(),
    });

    return j({ recommendations });
  } catch (err) {
    console.error('[time-slider-recommender]', err);
    return j({ error: 'Internal error' }, 500);
  }
});

// ═══════════════ 입력 검증 ═══════════════

function validateInput(i: RecommendInput): { ok: true } | { ok: false; error: string } {
  if (!i?.departure) return { ok: false, error: 'departure required' };
  if (typeof i.timeHours !== 'number' || i.timeHours < 1 || i.timeHours > 6) {
    return { ok: false, error: 'timeHours must be 1~6' };
  }
  if ('lat' in i.departure) {
    if (typeof i.departure.lat !== 'number' || typeof i.departure.lng !== 'number') {
      return { ok: false, error: 'invalid coords' };
    }
  } else if (!i.departure.address) {
    return { ok: false, error: 'address or coords required' };
  }
  return { ok: true };
}

// ═══════════════ 출발지 좌표 변환 (카카오 로컬) ═══════════════

async function resolveDeparture(d: RecommendInput['departure']): Promise<Coord> {
  if ('lat' in d) return { lat: d.lat, lng: d.lng };
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(d.address)}`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } });
  if (!res.ok) throw new Error(`kakao local failed: ${res.status}`);
  const data = await res.json();
  const doc = data.documents?.[0];
  if (!doc) throw new Error('주소를 찾을 수 없습니다');
  return { lat: Number(doc.y), lng: Number(doc.x) };
}

// ═══════════════ POI 후보 (PRD §11.4 인덱스) ═══════════════

async function fetchPoiCandidates(
  supabase: SupabaseClient,
  origin: Coord,
  radiusKm: number,
): Promise<PoiCandidate[]> {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((origin.lat * Math.PI) / 180));
  const cols =
    'id,name,type,lat,lng,address,image_urls,pet_policy_text,is_wellness,is_eco,pet_allowed,sigungu_code,content_type_id';
  const box = (q: any) =>
    q
      .gte('lat', origin.lat - latDelta)
      .lte('lat', origin.lat + latDelta)
      .gte('lng', origin.lng - lngDelta)
      .lte('lng', origin.lng + lngDelta);

  // 출발지에서 가까운 순으로 n 건. 박스 안 순서가 불확정이라 여기서 직접 정렬한다.
  const nearest = (rows: PoiCandidate[], n: number): PoiCandidate[] =>
    rows
      .map((p) => ({ p, d: haversineKm(origin, { lat: p.lat, lng: p.lng }) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, n)
      .map((x) => x.p);

  // 1) 펫 공식 등록. 정원의 절반까지만 — 나머지는 야외 몫으로 남긴다.
  //    (전량을 펫으로 채우면 쇼핑 편중 지역에서 야외가 한 곳도 후보에 못 든다)
  const petQuota = Math.ceil(MAX_CANDIDATES / 2);
  const { data: petData, error: petErr } = await box(
    supabase
      .from('pois')
      .select(cols)
      .eq('pet_allowed', true)
      // content_type_id 가 null 인 POI(사용자 제보 등)는 남긴다
      .or(`content_type_id.is.null,content_type_id.neq.${SHOPPING_CONTENT_TYPE}`),
  ).limit(CANDIDATE_POOL);
  if (petErr) throw petErr;
  const pet = nearest((petData ?? []) as PoiCandidate[], petQuota);

  // 2) 야외 장소는 항상 함께 조회한다 (펫 후보가 넉넉해도 점수로 경쟁시킨다).
  //    남은 정원을 모두 쓰므로 펫 등록이 적은 지역일수록 야외가 많이 들어온다.
  const { data: walkData } = await box(
    supabase
      .from('pois')
      .select(cols)
      .eq('pet_allowed', false)
      .in('content_type_id', OUTDOOR_CONTENT_TYPES),
  ).limit(CANDIDATE_POOL);
  const walk = nearest((walkData ?? []) as PoiCandidate[], MAX_CANDIDATES - pet.length);
  return [...pet, ...walk];
}

// ═══════════════ ETA (카카오모빌리티 + Upstash 24h 캐시) ═══════════════

async function getEtaCached(
  origin: Coord,
  poi: PoiCandidate,
): Promise<{ minutes: number; distanceKm: number }> {
  const cacheKey = `mob:eta:${geohash7(origin.lat, origin.lng)}|${poi.id}`;
  const cached = await redisGet(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* ignore */
    }
  }
  if (!KAKAO_REST_KEY) return fallbackEta(origin, poi); // 키 없음 → 폴백

  try {
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.lng},${origin.lat}&destination=${poi.lng},${poi.lat}&priority=RECOMMEND`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } });
    if (!res.ok) return fallbackEta(origin, poi);
    const data = await res.json();
    const summary = data.routes?.[0]?.summary;
    if (!summary) return fallbackEta(origin, poi);
    const result = { minutes: summary.duration / 60, distanceKm: summary.distance / 1000 };
    await redisSetEx(cacheKey, ETA_TTL_SEC, JSON.stringify(result));
    return result;
  } catch {
    return fallbackEta(origin, poi);
  }
}

// ═══════════════ 한적도 (현재 + 30일 예측 + 주간 평균) ═══════════════

// poi.id(UUID) → 32bit 결정적 해시 (FNV-1a). POI별 한적도 편차 산출용 (QA #2 임시).
function hash32(s: string): number {
  let h = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type QuietnessNowRow = {
  sigungu_code: number;
  hour_slot: number;
  score: number;
  sample_size: number | null;
};
type ForecastRow = { poi_id: string; forecast_date: string; expected_score: number };
type SigunguNowInfo = { nowScore: number; sampleSufficient: boolean };

// ── 배치 1/3: 시군구별 "현재" 한적도 (slice 내 distinct sigungu_code 만) ──
async function fetchQuietnessNow(
  supabase: SupabaseClient,
  sigungus: number[],
  weekday: number,
  hourSlot: number,
): Promise<Map<number, SigunguNowInfo>> {
  const map = new Map<number, SigunguNowInfo>();
  if (sigungus.length === 0) return map;

  // 시드는 3시간 간격(hour_slot 9·12·15·18·21)이라 정확한 시각이 없을 수 있다.
  // hour_slot 필터 없이 요일 전체를 받아, 시군구별로 요청 시각과 "가장 가까운" hour_slot 을
  // 매칭한다 → 어느 시각에 검색해도 표본이 잡혀 "표본 부족"이 뜨지 않는다.
  const { data } = await supabase
    .from('quietness_scores')
    .select('sigungu_code, hour_slot, score, sample_size')
    .in('sigungu_code', sigungus)
    .eq('weekday', weekday);

  const rowsBySigungu = new Map<number, QuietnessNowRow[]>();
  for (const r of (data ?? []) as QuietnessNowRow[]) {
    const list = rowsBySigungu.get(r.sigungu_code) ?? [];
    list.push(r);
    rowsBySigungu.set(r.sigungu_code, list);
  }

  for (const sigungu of sigungus) {
    const all = rowsBySigungu.get(sigungu) ?? [];
    const sampleSufficient = all.length > 0;
    let nowScore = 60; // 표본 없을 때 중립값
    if (sampleSufficient) {
      // 요청 시각과 가장 가까운 hour_slot 선택 (동률이면 먼저 오는 것)
      const nearestHour = all.reduce((best, r) =>
        Math.abs(r.hour_slot - hourSlot) < Math.abs(best.hour_slot - hourSlot) ? r : best,
      ).hour_slot;
      const rows = all.filter((r) => r.hour_slot === nearestHour);
      const totalW = rows.reduce((s: number, r: QuietnessNowRow) => s + (r.sample_size ?? 1), 0);
      nowScore =
        rows.reduce((s: number, r: QuietnessNowRow) => s + r.score * (r.sample_size ?? 1), 0) /
        totalW;
    }
    map.set(sigungu, { nowScore, sampleSufficient });
  }
  return map;
}

// ── 배치 2/3: POI별 예측 (내일 + 향후 7일) — 단일 range 쿼리로 tomorrow/week 모두 커버 ──
// startAt~startAt+7일 range 는 tomorrow(=startAt+1일)를 항상 포함하므로 쿼리를 분리할 필요가 없다.
async function fetchForecasts(
  supabase: SupabaseClient,
  poiIds: string[],
  startAt: Date,
): Promise<Map<string, ForecastRow[]>> {
  const map = new Map<string, ForecastRow[]>();
  if (poiIds.length === 0) return map;

  const weekFromNow = new Date(startAt);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const { data } = await supabase
    .from('poi_forecasts')
    .select('poi_id, forecast_date, expected_score')
    .in('poi_id', poiIds)
    .gte('forecast_date', startAt.toISOString().slice(0, 10))
    .lte('forecast_date', weekFromNow.toISOString().slice(0, 10));

  for (const r of (data ?? []) as ForecastRow[]) {
    const list = map.get(r.poi_id) ?? [];
    list.push(r);
    map.set(r.poi_id, list);
  }
  return map;
}

// ── 순수 함수: 배치로 가져온 데이터 + 결정적 오프셋으로 POI별 한적도 산출 ──
// (구 getQuietness 와 출력 동일 — QA #2 임시 편차 블록 그대로 보존)
function computeQuietness(
  poi: PoiCandidate,
  quietnessBySigungu: Map<number, SigunguNowInfo>,
  forecastRows: ForecastRow[],
  startAt: Date,
): {
  now: number;
  forecastTomorrow: number;
  weekAvg: number;
  sampleSufficient: boolean;
} {
  const tomorrow = new Date(startAt);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);

  const { nowScore, sampleSufficient } = quietnessBySigungu.get(poi.sigungu_code) ?? {
    nowScore: 60,
    sampleSufficient: false,
  };

  const forecastRow = forecastRows.find((r) => r.forecast_date === tomorrowDate);
  const hadForecast = !!forecastRow;
  const rawForecast = forecastRow?.expected_score ?? nowScore;

  const hadWeek = forecastRows.length > 0;
  const rawWeekAvg = hadWeek
    ? forecastRows.reduce((s: number, r: ForecastRow) => s + r.expected_score, 0) /
      forecastRows.length
    : nowScore;

  // ── 임시(Phase 1): POI별 결정적 한적도 편차 (QA #2) ──────────────────
  // quietness_scores 는 (sigungu_code, weekday, hour_slot) 단위라 같은 시군구 POI 는 nowScore 가 동일하고,
  // poi_forecasts 미시드로 forecast/week 도 nowScore 로 폴백 → 카드마다 한적도가 똑같아 보인다.
  // poi.id(UUID) 해시로 결정적(재실행 동일) 편차를 얹어 카드별로 달라 보이게 한다.
  // 실측 값이 있을 때(hadForecast/hadWeek)는 그대로 사용하고, 폴백일 때만 합성 편차를 적용한다.
  // TODO: 데이터랩 실측 per-POI 값 확보 시 이 편차 블록 제거 (decisionsNeeded 참고).
  const h = hash32(poi.id);
  const offNow = (h % 17) - 8; // -8 ~ +8
  const offFc = ((h >>> 8) % 13) - 4; // -4 ~ +8 (예측은 살짝 상방 편향)
  const offWk = ((h >>> 16) % 11) - 5; // -5 ~ +5
  const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const now = clampScore(nowScore + offNow);
  const forecastTomorrow = hadForecast ? rawForecast : clampScore(rawForecast + offNow + offFc);
  const weekAvg = hadWeek ? rawWeekAvg : clampScore(rawWeekAvg + offNow + offWk);

  return { now, forecastTomorrow, weekAvg, sampleSufficient };
}

// ═══════════════ 검증 수 (PRD §6.3: 6개월 + isValid + 사진) — 배치 3/3 ═══════════════

async function fetchVerifiedCounts(
  supabase: SupabaseClient,
  poiIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (poiIds.length === 0) return map;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const { data } = await supabase
    .from('verifications')
    .select('poi_id')
    .in('poi_id', poiIds)
    .eq('is_valid', true)
    .not('photo_url', 'is', null)
    .gte('visited_at', sixMonthsAgo.toISOString());

  for (const r of (data ?? []) as { poi_id: string }[]) {
    map.set(r.poi_id, (map.get(r.poi_id) ?? 0) + 1);
  }
  return map;
}

// ═══════════════ 배지 일괄 조회 ═══════════════

async function fetchBadges(
  supabase: SupabaseClient,
  poiIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (poiIds.length === 0) return map;
  const { data } = await supabase.from('badges').select('poi_id, badge_type').in('poi_id', poiIds);
  for (const r of data ?? []) {
    const list = map.get(r.poi_id) ?? [];
    list.push(r.badge_type);
    map.set(r.poi_id, list);
  }
  return map;
}

// ═══════════════ Rate Limit (Upstash) ═══════════════

async function checkRateLimit(userId: string): Promise<boolean> {
  if (!UPSTASH_ON) return true; // 개발/미설정: 레이트리밋 skip
  const key = `rl:recommend:${userId}`;
  const count = await redisIncr(key);
  if (count === 1) await redisExpire(key, RATE_LIMIT_WINDOW_SEC);
  return count <= RATE_LIMIT_MAX;
}

// ═══════════════ Upstash Redis REST ═══════════════

async function redisGet(key: string): Promise<string | null> {
  if (!UPSTASH_ON) return null;
  const r = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!r.ok) return null;
  const { result } = await r.json();
  return result ?? null;
}

async function redisSetEx(key: string, ttl: number, value: string): Promise<void> {
  if (!UPSTASH_ON) return;
  await fetch(`${UPSTASH_URL}/setex/${encodeURIComponent(key)}/${ttl}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'text/plain' },
    body: value,
  });
}

async function redisIncr(key: string): Promise<number> {
  const r = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const { result } = await r.json();
  return Number(result);
}

async function redisExpire(key: string, ttl: number): Promise<void> {
  await fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${ttl}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
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

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function haversineKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// 카카오 모빌리티 불가 시 근사 ETA: 직선거리 × 1.3(도로계수) / 평균속도
function fallbackEta(origin: Coord, poi: PoiCandidate): { minutes: number; distanceKm: number } {
  const straight = haversineKm(origin, { lat: poi.lat, lng: poi.lng });
  const distanceKm = straight * 1.3;
  const minutes = (distanceKm / AVG_SPEED_KMH) * 60;
  return { minutes, distanceKm };
}
