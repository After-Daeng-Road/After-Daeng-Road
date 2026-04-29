// 댕로드 — F1 시간슬라이더 추천 Edge Function
// PRD §12.2 알고리즘 / §13.2 endpoint 매핑 / §13.5 비용 통제(Upstash 24h ETA 캐시)
// 런타임: Supabase Edge Functions (Deno)
// ORM: Edge에서는 Prisma ✗ → @supabase/supabase-js + raw SQL (PRD §10.2)

// @ts-expect-error — Deno URL imports는 Node TS 검사기에서 미인식
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
};

// ═══════════════ 환경 변수 ═══════════════

// @ts-expect-error — Deno global
const env = (k: string): string => Deno.env.get(k) ?? '';

const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE = env('SUPABASE_SERVICE_ROLE_KEY');
const KAKAO_REST_KEY = env('KAKAO_REST_API_KEY');
const UPSTASH_URL = env('UPSTASH_REDIS_REST_URL');
const UPSTASH_TOKEN = env('UPSTASH_REDIS_REST_TOKEN');

// ═══════════════ 상수 ═══════════════

const ETA_TTL_SEC = 24 * 60 * 60; // PRD §13.5
const RATE_LIMIT_WINDOW_SEC = 60; // PRD §10.1: 분당 30회
const RATE_LIMIT_MAX = 30;
const AVG_SPEED_KMH = 50; // 1차 휴리스틱 (PRD §12.2)
const TOP_N = 3;
const MAX_CANDIDATES = 30;

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

  // 1. 사용자 인증 (Auth.js JWT → Supabase JWT)
  const authHeader = req.headers.get('Authorization');
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader ?? '' } },
    auth: { persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const userId = userData?.user?.id;
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

    // ─ ETA + 한적도 + 검증 수 병렬 조회 ─
    const enriched = await Promise.all(
      candidates.slice(0, MAX_CANDIDATES).map(async (poi) => {
        const [eta, quietness, verifiedCount] = await Promise.all([
          getEtaCached(origin, poi),
          getQuietness(admin, poi, startAt),
          getVerifiedCount(admin, poi.id),
        ]);
        return { poi, eta, quietness, verifiedCount };
      }),
    );

    // ─ 시간 예산(왕복 = timeHours/2 시간 = 분) 안에 들어오는 것만 ─
    const budgetMin = (input.timeHours / 2) * 60;
    const inBudget = enriched.filter((e) => e.eta && e.eta.minutes <= budgetMin);
    if (inBudget.length === 0) return j({ recommendations: [] });

    // ─ 점수 (PRD §12.2): 0.4*quietness + 0.3*verification + 0.2*dist_inv + 0.1*weather ─
    const maxDist = Math.max(...inBudget.map((e) => e.eta!.distanceKm), 1);
    const scored = inBudget
      .map((e) => {
        const verifNorm = Math.min(e.verifiedCount / 10, 1);
        const distInverse = 1 - e.eta!.distanceKm / maxDist;
        const weatherIndoor = e.poi.type === 'CAFE' || e.poi.type === 'RESTAURANT' ? 0.7 : 0.3;
        // 카테고리 가산점 (PRD §6.2 웰니스/생태 +5)
        const categoryBonus = (e.poi.is_wellness ? 5 : 0) + (e.poi.is_eco ? 5 : 0);
        const quietnessAdj = Math.min(100, e.quietness.now + categoryBonus);
        const score =
          0.4 * (quietnessAdj / 100) + 0.3 * verifNorm + 0.2 * distInverse + 0.1 * weatherIndoor;
        return { ...e, score, quietnessAdj };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N);

    // ─ 배지 일괄 조회 ─
    const poiIds = scored.map((s) => s.poi.id);
    const badgesByPoi = await fetchBadges(admin, poiIds);

    const recommendations: Recommendation[] = scored.map((s) => ({
      poiId: s.poi.id,
      name: s.poi.name,
      address: s.poi.address ?? '',
      lat: s.poi.lat,
      lng: s.poi.lng,
      sourceLabel: s.poi.type === 'TRAIL' ? '두루누비 코스' : '펫동반 가능',
      type: s.poi.type,
      imageUrl: s.poi.image_urls?.[0] ?? null,
      badges: badgesByPoi.get(s.poi.id) ?? [],
      sampleSufficient: s.quietness.sampleSufficient,
      reason: {
        distanceKm: round1(s.eta!.distanceKm),
        etaMin: Math.round(s.eta!.minutes),
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
  // lat/lng 박스 1차 필터 → 정밀 거리는 ETA 단계에서 결정
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((origin.lat * Math.PI) / 180));
  const { data, error } = await supabase
    .from('pois')
    .select(
      'id,name,type,lat,lng,address,image_urls,pet_policy_text,is_wellness,is_eco,pet_allowed,sigungu_code',
    )
    .eq('pet_allowed', true)
    .gte('lat', origin.lat - latDelta)
    .lte('lat', origin.lat + latDelta)
    .gte('lng', origin.lng - lngDelta)
    .lte('lng', origin.lng + lngDelta)
    .limit(MAX_CANDIDATES);
  if (error) throw error;
  return (data ?? []) as PoiCandidate[];
}

// ═══════════════ ETA (카카오모빌리티 + Upstash 24h 캐시) ═══════════════

async function getEtaCached(
  origin: Coord,
  poi: PoiCandidate,
): Promise<{ minutes: number; distanceKm: number } | null> {
  const cacheKey = `mob:eta:${geohash7(origin.lat, origin.lng)}|${poi.id}`;
  const cached = await redisGet(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* ignore */
    }
  }

  const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.lng},${origin.lat}&destination=${poi.lng},${poi.lat}&priority=RECOMMEND`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  const summary = data.routes?.[0]?.summary;
  if (!summary) return null;

  const result = { minutes: summary.duration / 60, distanceKm: summary.distance / 1000 };
  await redisSetEx(cacheKey, ETA_TTL_SEC, JSON.stringify(result));
  return result;
}

// ═══════════════ 한적도 (현재 + 30일 예측 + 주간 평균) ═══════════════

async function getQuietness(
  supabase: SupabaseClient,
  poi: PoiCandidate,
  startAt: Date,
): Promise<{
  now: number;
  forecastTomorrow: number;
  weekAvg: number;
  sampleSufficient: boolean;
}> {
  const weekday = startAt.getDay();
  const hourSlot = startAt.getHours();
  const tomorrow = new Date(startAt);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);
  const weekFromNow = new Date(startAt);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const [{ data: nowRows }, { data: forecastRow }, { data: weekRows }] = await Promise.all([
    supabase
      .from('quietness_scores')
      .select('score, sample_size')
      .eq('sigungu_code', poi.sigungu_code)
      .eq('weekday', weekday)
      .eq('hour_slot', hourSlot),
    supabase
      .from('poi_forecasts')
      .select('expected_score')
      .eq('poi_id', poi.id)
      .eq('forecast_date', tomorrowDate)
      .maybeSingle(),
    supabase
      .from('poi_forecasts')
      .select('expected_score')
      .eq('poi_id', poi.id)
      .gte('forecast_date', startAt.toISOString().slice(0, 10))
      .lte('forecast_date', weekFromNow.toISOString().slice(0, 10)),
  ]);

  type QuietnessRow = { score: number; sample_size: number | null };
  type ForecastRow = { expected_score: number };

  const rows = (nowRows ?? []) as QuietnessRow[];
  const sampleSufficient = rows.length > 0;
  let nowScore = 60; // 표본 없을 때 중립값
  if (sampleSufficient) {
    const totalW = rows.reduce((s: number, r: QuietnessRow) => s + (r.sample_size ?? 1), 0);
    nowScore =
      rows.reduce((s: number, r: QuietnessRow) => s + r.score * (r.sample_size ?? 1), 0) / totalW;
  }

  const forecastTomorrow = (forecastRow as ForecastRow | null)?.expected_score ?? nowScore;
  const week = (weekRows ?? []) as ForecastRow[];
  const weekAvg =
    week.length > 0
      ? week.reduce((s: number, r: ForecastRow) => s + r.expected_score, 0) / week.length
      : nowScore;

  return { now: nowScore, forecastTomorrow, weekAvg, sampleSufficient };
}

// ═══════════════ 검증 수 (PRD §6.3: 6개월 + isValid + 사진) ═══════════════

async function getVerifiedCount(supabase: SupabaseClient, poiId: string): Promise<number> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const { count } = await supabase
    .from('verifications')
    .select('id', { count: 'exact', head: true })
    .eq('poi_id', poiId)
    .eq('is_valid', true)
    .not('photo_url', 'is', null)
    .gte('visited_at', sixMonthsAgo.toISOString());
  return count ?? 0;
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
  const key = `rl:recommend:${userId}`;
  const count = await redisIncr(key);
  if (count === 1) await redisExpire(key, RATE_LIMIT_WINDOW_SEC);
  return count <= RATE_LIMIT_MAX;
}

// ═══════════════ Upstash Redis REST ═══════════════

async function redisGet(key: string): Promise<string | null> {
  const r = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  if (!r.ok) return null;
  const { result } = await r.json();
  return result ?? null;
}

async function redisSetEx(key: string, ttl: number, value: string): Promise<void> {
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
