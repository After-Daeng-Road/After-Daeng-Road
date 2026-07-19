# 추천 실데이터화 (Phase 1+2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 상태에서 "지금 추천받기"를 누르면 한국관광공사 TourAPI 실데이터 기반으로 충남 4개 시(공주·천안·아산·서산)의 펫동반 장소가 리스트로 뜨고, 후보가 적어도 빈 결과가 안 나오게 한다.

**Architecture:** (1) Node/tsx + Prisma 시드 스크립트로 TourAPI 실데이터를 `pois`에 적재(초기 로드). (2) Edge 추천 함수(`time-slider-recommender`)의 외부 의존성(Upstash·Kakao) fail-open + ETA 폴백 + 펫우선/fallback 랭킹. (3) Edge ETL(`tour-api-etl`)은 크론 정합성을 위해 같은 버그 수정. (4) api-docs 동기화.

**Tech Stack:** Next.js 15 / Supabase Edge Functions(Deno) / Prisma + PostgreSQL(로컬 Supabase) / tsx / jose(JWT) / 한국관광공사 TourAPI(data.go.kr KorService2).

설계 근거: `docs/superpowers/specs/2026-07-19-recommend-realdata-design.md`

---

## 파일 구조

**신규**
- `apps/api/prisma/tourapi/transform.ts` — 순수 변환 헬퍼(도시설정·contentType 매핑·펫필드 파싱·geohash7·row 빌더)
- `apps/api/prisma/tourapi/transform.test.ts` — 위 순수함수 단위테스트(node --test)
- `apps/api/prisma/tourapi/client.ts` — TourAPI 호출(areaBasedList2 / detailPetTour2)
- `apps/api/prisma/seed-tourapi.ts` — 초기 실데이터 적재 실행부(Prisma upsert)
- `apps/api/scripts/verify-recommend.ts` — 추천 E2E 통합검증(JWT 발급→호출→검증)

**수정**
- `apps/api/supabase/functions/time-slider-recommender/index.ts` — fail-open, ETA 폴백, 펫우선+fallback, petAllowed 노출
- `apps/api/supabase/functions/tour-api-etl/index.ts` — 파라미터/엔드포인트/펫필드 수정(크론 정합성)
- `apps/api/package.json` — `seed:tourapi`, `verify:recommend` 스크립트
- `package.json`(root) + `apps/api/package.json` — `dev:api`/`supabase:serve` cwd+env-file
- `apps/api/.env` — `TOUR_API_SERVICE_KEY` 추가(로컬)
- `apps/web/lib/api-docs/openapi.ts` — `/tour-api-etl` 설명·`Poi`·`Recommendation` 갱신

---

## Task 0: 준비 — TourAPI 키를 apps/api 로 복제

**Files:**
- Modify: `apps/api/.env` (gitignored)

- [ ] **Step 1: apps/api/.env 에 키 추가**

`apps/web/.env.local`의 `TOUR_API_SERVICE_KEY` 값을 그대로 `apps/api/.env` 하단에 추가한다(모노레포 컨벤션상 앱별 env 중복 정상, CLAUDE.md).

```bash
# 값 확인(마스킹) 후 apps/api/.env 로 복사 — 실제 값은 에디터로 붙여넣기
grep '^TOUR_API_SERVICE_KEY=' apps/web/.env.local | sed -E 's/=.*/=<이 값을 apps\/api\/.env 에 추가>/'
```

`apps/api/.env` 에 다음 줄 추가:
```
TOUR_API_SERVICE_KEY="<apps/web/.env.local 과 동일한 Decoding 키>"
```

- [ ] **Step 2: Prisma가 .env를 process.env로 로드하는지 확인**

Run: `cd apps/api && npx tsx -e "import '@prisma/client'; console.log('TOUR set?', !!process.env.TOUR_API_SERVICE_KEY, 'DB set?', !!process.env.DATABASE_URL)"`
Expected: `TOUR set? true DB set? true`
만약 `TOUR set? false` 면 seed 스크립트가 `import 'dotenv/config'`를 첫 줄에 추가(dotenv는 Prisma 의존성으로 이미 존재).

---

## Task 1: TourAPI 순수 변환 헬퍼 + 단위테스트

**Files:**
- Create: `apps/api/prisma/tourapi/transform.ts`
- Test: `apps/api/prisma/tourapi/transform.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `apps/api/prisma/tourapi/transform.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contentTypeToPoiType,
  parsePetFields,
  geohash7,
  CHUNGNAM_CITIES,
  LDONG_REGN_CD,
} from './transform.ts';

test('contentTypeToPoiType 매핑', () => {
  assert.equal(contentTypeToPoiType(25), 'TRAIL'); // 여행코스
  assert.equal(contentTypeToPoiType(39), 'RESTAURANT'); // 음식점
  assert.equal(contentTypeToPoiType(32), 'ACCOMMODATION'); // 숙박
  assert.equal(contentTypeToPoiType(999), 'ATTRACTION'); // 미매핑 → 기본
});

test('parsePetFields — 전구역 동반가능', () => {
  const f = parsePetFields({
    acmpyTypeCd: '전구역 동반가능',
    acmpyPsblCpam: '전 견종 동반 가능',
    acmpyNeedMtr: '목줄 착용',
    etcAcmpyInfo: '맹견 입마개 필수',
  });
  assert.equal(f.petAllowed, true);
  assert.equal(f.petIndoor, true);
  assert.equal(f.petOutdoor, true);
  assert.ok(f.petPolicyText?.includes('목줄'));
});

test('parsePetFields — 실외만', () => {
  const f = parsePetFields({ acmpyTypeCd: '실외 동반가능', acmpyPsblCpam: '소형견(10kg 이하)' });
  assert.equal(f.petIndoor, false);
  assert.equal(f.petOutdoor, true);
  assert.equal(f.petSizeMaxKg, 10);
});

test('parsePetFields — 데이터 없음(미등록)', () => {
  const f = parsePetFields(null);
  assert.equal(f.petAllowed, false);
  assert.equal(f.petIndoor, null);
  const f2 = parsePetFields({ contentid: '123' } as never);
  assert.equal(f2.petAllowed, false);
});

test('geohash7 은 7자리', () => {
  const h = geohash7(36.4555, 127.119);
  assert.equal(h.length, 7);
  assert.equal(geohash7(36.4555, 127.119), h); // 결정적
});

test('CHUNGNAM_CITIES 구성', () => {
  assert.equal(LDONG_REGN_CD, 44);
  assert.equal(CHUNGNAM_CITIES.length, 4);
  const cheonan = CHUNGNAM_CITIES.find((c) => c.name === '천안')!;
  assert.deepEqual(cheonan.signgu, [131, 133]); // 동남구+서북구
  assert.equal(cheonan.sigunguCode, 33040);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/api && node --import tsx --test prisma/tourapi/transform.test.ts`
Expected: FAIL — `Cannot find module './transform.ts'`

- [ ] **Step 3: transform.ts 구현**

Create `apps/api/prisma/tourapi/transform.ts`:
```ts
// 댕로드 TourAPI 순수 변환 헬퍼 (Node/tsx). 네트워크·Prisma 의존 없음 → 단위테스트 대상.
// 근거: 2026-07-19 실데이터 프로브 (KorService2/areaBasedList2 + detailPetTour2)

export type PoiTypeStr =
  | 'CAFE' | 'RESTAURANT' | 'TRAIL' | 'PARK' | 'ATTRACTION' | 'ACCOMMODATION' | 'REST_AREA';

export const LDONG_REGN_CD = 44; // 충청남도 법정동 시도코드

// 조회는 법정동 시군구(3자리), 저장은 구 sigunguCode(33xxx — quietness 시드와 정합)
export const CHUNGNAM_CITIES = [
  { name: '공주', signgu: [150], sigunguCode: 33020, center: { lat: 36.4555, lng: 127.119 } },
  { name: '천안', signgu: [131, 133], sigunguCode: 33040, center: { lat: 36.8151, lng: 127.1138 } },
  { name: '아산', signgu: [200], sigunguCode: 33050, center: { lat: 36.7898, lng: 127.0017 } },
  { name: '서산', signgu: [210], sigunguCode: 33150, center: { lat: 36.7848, lng: 126.4503 } },
] as const;

// contentTypeId(12관광지·14문화·15축제·25여행코스·28레포츠·32숙박·38쇼핑·39음식점)
const CONTENT_TYPE_MAP: Record<number, PoiTypeStr> = {
  12: 'ATTRACTION', 14: 'ATTRACTION', 15: 'ATTRACTION', 25: 'TRAIL',
  28: 'ATTRACTION', 32: 'ACCOMMODATION', 38: 'ATTRACTION', 39: 'RESTAURANT',
};

export function contentTypeToPoiType(id: number | string): PoiTypeStr {
  return CONTENT_TYPE_MAP[Number(id)] ?? 'ATTRACTION';
}

export type PetDetail = {
  acmpyTypeCd?: string;      // 동반 구역 (전구역/실내/실외)
  acmpyPsblCpam?: string;    // 동반 가능 반려동물/견종
  acmpyNeedMtr?: string;     // 필요 준비물
  etcAcmpyInfo?: string;     // 기타 동반 정보
  relaAcdntRiskMtr?: string; // 관련 위험/견종
};

export type PetFields = {
  petAllowed: boolean;
  petIndoor: boolean | null;
  petOutdoor: boolean | null;
  petPolicyText: string | null;
  petSizeMaxKg: number | null;
};

export function parsePetFields(pet: PetDetail | null | undefined): PetFields {
  const hasData =
    !!pet &&
    !!(pet.acmpyTypeCd || pet.acmpyPsblCpam || pet.acmpyNeedMtr || pet.etcAcmpyInfo || pet.relaAcdntRiskMtr);
  if (!hasData) {
    return { petAllowed: false, petIndoor: null, petOutdoor: null, petPolicyText: null, petSizeMaxKg: null };
  }
  const zone = String(pet!.acmpyTypeCd ?? '');
  const petIndoor = zone ? zone.includes('실내') || zone.includes('전구역') : null;
  const petOutdoor = zone ? zone.includes('실외') || zone.includes('전구역') : null;
  const parts = [pet!.acmpyPsblCpam, pet!.acmpyNeedMtr, pet!.etcAcmpyInfo]
    .map((s) => (s ?? '').trim())
    .filter(Boolean);
  const petPolicyText = parts.length ? parts.join(' / ') : null;
  const kg = String(pet!.acmpyPsblCpam ?? '').match(/(\d+)\s*kg/i);
  const petSizeMaxKg = kg ? Number(kg[1]) : null;
  return { petAllowed: true, petIndoor, petOutdoor, petPolicyText, petSizeMaxKg };
}

export type TourItem = {
  contentid: string | number;
  contenttypeid: string | number;
  title: string;
  addr1?: string;
  mapx?: string | number; // 경도 lng
  mapy?: string | number; // 위도 lat
  firstimage?: string;
  tel?: string;
};

export type PoiInput = {
  source: 'TOUR_API_KOR';
  sourceId: string;
  contentTypeId: number;
  name: string;
  type: PoiTypeStr;
  sigunguCode: number;
  address: string | null;
  lat: number;
  lng: number;
  geohash7: string;
  imageUrls: string[];
  phone: string | null;
  lastSyncedAt: Date;
} & PetFields;

export function buildPoiInput(
  item: TourItem,
  pet: PetDetail | null,
  sigunguCode: number,
  now: Date,
): PoiInput {
  const lat = Number(item.mapy);
  const lng = Number(item.mapx);
  return {
    source: 'TOUR_API_KOR',
    sourceId: String(item.contentid),
    contentTypeId: Number(item.contenttypeid),
    name: item.title,
    type: contentTypeToPoiType(item.contenttypeid),
    sigunguCode,
    address: item.addr1?.trim() || null,
    lat,
    lng,
    geohash7: geohash7(lat, lng),
    imageUrls: item.firstimage ? [item.firstimage] : [],
    phone: item.tel?.trim() || null,
    lastSyncedAt: now,
    ...parsePetFields(pet),
  };
}

export function geohash7(lat: number, lng: number): string {
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
      if (lng >= mid) { bits = (bits << 1) | 1; lngR = [mid, lngR[1]]; }
      else { bits = bits << 1; lngR = [lngR[0], mid]; }
    } else {
      const mid = (latR[0] + latR[1]) / 2;
      if (lat >= mid) { bits = (bits << 1) | 1; latR = [mid, latR[1]]; }
      else { bits = bits << 1; latR = [latR[0], mid]; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { hash += BASE32[bits]; bits = 0; bit = 0; }
  }
  return hash;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/api && node --import tsx --test prisma/tourapi/transform.test.ts`
Expected: PASS (6 tests). `TRAIL`/`RESTAURANT`/펫필드/geohash7 전부 통과.
(만약 `--import tsx` 인식 안 되면: `node --loader tsx --test prisma/tourapi/transform.test.ts`)

- [ ] **Step 5: 커밋**

```bash
git add apps/api/prisma/tourapi/transform.ts apps/api/prisma/tourapi/transform.test.ts
git commit -m "feat(api): TourAPI 순수 변환 헬퍼 + 단위테스트 (법정동·펫필드·contentType)"
```

---

## Task 2: TourAPI 호출 클라이언트

**Files:**
- Create: `apps/api/prisma/tourapi/client.ts`

- [ ] **Step 1: client.ts 구현**

Create `apps/api/prisma/tourapi/client.ts`:
```ts
// 댕로드 TourAPI 호출부 (Node). serviceKey=Decoding 키, URLSearchParams 자동 인코딩.
// 근거 프로브: areaBasedList2(lDongRegnCd/lDongSignguCd) + detailPetTour2(contentId)
import { LDONG_REGN_CD, type TourItem, type PetDetail } from './transform.ts';

const BASE = 'https://apis.data.go.kr/B551011';
const UA = 'Mozilla/5.0 (daengroad ETL)';

function requireKey(): string {
  const k = process.env.TOUR_API_SERVICE_KEY;
  if (!k) throw new Error('TOUR_API_SERVICE_KEY 미설정 (apps/api/.env)');
  return k;
}

function url(path: string, params: Record<string, string | number>): string {
  const u = new URL(`${BASE}/${path}`);
  const all = { MobileOS: 'ETC', MobileApp: 'daengroad', _type: 'json', serviceKey: requireKey(), ...params };
  for (const [k, v] of Object.entries(all)) u.searchParams.set(k, String(v));
  return u.toString();
}

async function getJson(u: string): Promise<any> {
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* 비JSON 에러 */ }
  const code = json?.response?.header?.resultCode;
  if (code !== '0000') {
    throw new Error(`TourAPI 실패 HTTP ${res.status} code=${code ?? '?'} ${text.slice(0, 120)}`);
  }
  return json;
}

function asArray<T>(item: T | T[] | undefined | ''): T[] {
  if (!item || item === '') return [];
  return Array.isArray(item) ? item : [item];
}

/** 한 시군구(법정동 3자리)의 전체 POI (페이지네이션) */
export async function fetchAreaBasedList(signgu: number): Promise<TourItem[]> {
  const out: TourItem[] = [];
  const numOfRows = 100;
  for (let pageNo = 1; pageNo <= 20; pageNo++) {
    const json = await getJson(
      url('KorService2/areaBasedList2', {
        numOfRows, pageNo, arrange: 'C', lDongRegnCd: LDONG_REGN_CD, lDongSignguCd: signgu,
      }),
    );
    const body = json.response.body;
    const items = asArray<TourItem>(body?.items?.item);
    out.push(...items);
    if (out.length >= Number(body?.totalCount ?? 0) || items.length < numOfRows) break;
  }
  return out;
}

/** contentId 의 펫 동반 상세 (없으면 null) */
export async function fetchDetailPetTour(contentId: string | number): Promise<PetDetail | null> {
  try {
    const json = await getJson(url('KorService2/detailPetTour2', { contentId }));
    const item = json.response.body?.items?.item;
    const first = Array.isArray(item) ? item[0] : item;
    return first && typeof first === 'object' ? (first as PetDetail) : null;
  } catch {
    return null; // 펫 미등록/조회실패는 미동반으로 처리
  }
}
```

- [ ] **Step 2: 스모크 실행 (공주 1페이지만)**

Run: `cd apps/api && npx tsx -e "import {fetchAreaBasedList} from './prisma/tourapi/client.ts'; const r = await fetchAreaBasedList(150); console.log('공주 items:', r.length, r[0]?.title)"`
Expected: `공주 items: 100 <어떤 장소명>` (에러 없이 실데이터)

- [ ] **Step 3: 커밋**

```bash
git add apps/api/prisma/tourapi/client.ts
git commit -m "feat(api): TourAPI 호출 클라이언트 (areaBasedList2 + detailPetTour2)"
```

---

## Task 3: 초기 실데이터 적재 시드 스크립트

**Files:**
- Create: `apps/api/prisma/seed-tourapi.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: seed-tourapi.ts 구현**

Create `apps/api/prisma/seed-tourapi.ts`:
```ts
// 댕로드 — TourAPI 실데이터 초기 적재 (충남 4개 시). 실행: npm run seed:tourapi
// Edge tour-api-etl(크론)과 동일 로직의 Node 판. 초기 로드는 tsx+Prisma 가 안정적.
import { PrismaClient } from '@prisma/client';
import { CHUNGNAM_CITIES, buildPoiInput } from './tourapi/transform.ts';
import { fetchAreaBasedList, fetchDetailPetTour } from './tourapi/client.ts';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  let added = 0, updated = 0, pet = 0, failed = 0;

  // 초기 로드: 기존 TourAPI 소스 POI 정리 후 실데이터로 교체 (quietness 는 sigunguCode 기준이라 보존)
  await prisma.poi.deleteMany({ where: { source: 'TOUR_API_KOR' } });

  for (const city of CHUNGNAM_CITIES) {
    const items = (await Promise.all(city.signgu.map((s) => fetchAreaBasedList(s)))).flat();
    console.log(`[${city.name}] POI ${items.length}건 수집`);
    for (const item of items) {
      try {
        if (!item.mapx || !item.mapy) { continue; } // 좌표 없는 항목 skip
        const petDetail = await fetchDetailPetTour(item.contentid);
        const row = buildPoiInput(item, petDetail, city.sigunguCode, now);
        if (row.petAllowed) pet++;
        await prisma.poi.upsert({
          where: { source_sourceId: { source: 'TOUR_API_KOR', sourceId: row.sourceId } },
          create: row,
          update: row,
        });
        added++;
      } catch (e) {
        failed++;
        console.error('  item 실패', item.contentid, (e as Error).message);
      }
    }
  }
  console.log(`\n적재 완료: 총 ${added} (펫동반 ${pet}, 실패 ${failed})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
```

- [ ] **Step 2: package.json 스크립트 추가**

Modify `apps/api/package.json` scripts (기존 `"seed"` 아래에 추가):
```json
    "seed:tourapi": "tsx prisma/seed-tourapi.ts",
```

- [ ] **Step 3: 실데이터 적재 실행**

Run: `cd apps/api && npm run seed:tourapi`
Expected(약 1~3분, detailPetTour2 호출 다수): `적재 완료: 총 ~900 (펫동반 ~70, 실패 0~few)`

- [ ] **Step 4: DB 검증**

Run:
```bash
cd apps/api && npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); const total=await p.poi.count({where:{source:'TOUR_API_KOR'}}); const pet=await p.poi.count({where:{source:'TOUR_API_KOR',petAllowed:true}}); const codes=await p.poi.groupBy({by:['sigunguCode'],where:{source:'TOUR_API_KOR'},_count:true}); console.log({total,pet,codes}); await p.\$disconnect()"
```
Expected: `total` 800~1000, `pet` 40~120, `codes` 에 33020/33040/33050/33150 4종 존재.

- [ ] **Step 5: 커밋**

```bash
git add apps/api/prisma/seed-tourapi.ts apps/api/package.json
git commit -m "feat(api): TourAPI 실데이터 초기 적재 시드 (충남 4개 시 ~950 POI)"
```

---

## Task 4: 추천 함수 — Upstash fail-open

**Files:**
- Modify: `apps/api/supabase/functions/time-slider-recommender/index.ts`

- [ ] **Step 1: Upstash 설정 여부 플래그 추가**

`const UPSTASH_TOKEN = env('UPSTASH_REDIS_REST_TOKEN');` (73행) 바로 아래에 추가:
```ts
const UPSTASH_ON = !!(UPSTASH_URL && UPSTASH_TOKEN); // 미설정 시 캐시/레이트리밋 fail-open
```

- [ ] **Step 2: checkRateLimit fail-open**

`checkRateLimit`(427행) 본문 첫 줄에 가드 추가:
```ts
async function checkRateLimit(userId: string): Promise<boolean> {
  if (!UPSTASH_ON) return true; // 개발/미설정: 레이트리밋 skip
  const key = `rl:recommend:${userId}`;
  const count = await redisIncr(key);
  if (count === 1) await redisExpire(key, RATE_LIMIT_WINDOW_SEC);
  return count <= RATE_LIMIT_MAX;
}
```

- [ ] **Step 3: redisGet/redisSetEx no-op 가드**

`redisGet`(436행) 첫 줄: `if (!UPSTASH_ON) return null;`
`redisSetEx`(445행) 첫 줄: `if (!UPSTASH_ON) return;`
(redisIncr/redisExpire 는 checkRateLimit 가드로 보호되므로 그대로 둠)

- [ ] **Step 4: 타입체크**

Run: `cd apps/api && npx tsc --noEmit 2>&1 | grep -v "esm.sh\|Deno" | head`
Expected: Deno URL import 관련 외 신규 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add apps/api/supabase/functions/time-slider-recommender/index.ts
git commit -m "fix(api): 추천 함수 Upstash fail-open (미설정 시 크래시→skip)"
```

---

## Task 5: 추천 함수 — ETA haversine 폴백

**Files:**
- Modify: `apps/api/supabase/functions/time-slider-recommender/index.ts`

- [ ] **Step 1: haversine 유틸 추가**

`round1`(507행) 함수 아래에 추가:
```ts
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
```

- [ ] **Step 2: getEtaCached 가 항상 값 반환하도록 폴백 연결**

`getEtaCached`(304행)를 아래로 교체 — 반환타입 non-null, 카카오 키 없거나 실패하면 폴백:
```ts
async function getEtaCached(
  origin: Coord,
  poi: PoiCandidate,
): Promise<{ minutes: number; distanceKm: number }> {
  const cacheKey = `mob:eta:${geohash7(origin.lat, origin.lng)}|${poi.id}`;
  const cached = await redisGet(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* ignore */ }
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
```

- [ ] **Step 3: eta null 분기 제거**

`getEtaCached` 가 이제 non-null 이므로 핸들러의 필터(180행)와 참조(184·188·216·217행)의 `e.eta!`/`e.eta &&` 를 정리:
- 180행 `const inBudget = enriched.filter((e) => e.eta && e.eta.minutes <= budgetMin);`
  → `const inBudget = enriched.filter((e) => e.eta.minutes <= budgetMin);`
- 184행 `Math.max(...inBudget.map((e) => e.eta!.distanceKm), 1);` → `e.eta.distanceKm`
- 188행 `1 - e.eta!.distanceKm / maxDist;` → `e.eta.distanceKm`
- 216행 `round1(s.eta!.distanceKm)` → `round1(s.eta.distanceKm)`
- 217행 `Math.round(s.eta!.minutes)` → `Math.round(s.eta.minutes)`

- [ ] **Step 4: 타입체크**

Run: `cd apps/api && npx tsc --noEmit 2>&1 | grep -v "esm.sh\|Deno" | head`
Expected: 신규 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add apps/api/supabase/functions/time-slider-recommender/index.ts
git commit -m "fix(api): ETA haversine 폴백 (카카오 모빌리티 없어도 추천 동작)"
```

---

## Task 6: 추천 함수 — 펫 우선 + 비펫 야외 fallback + petAllowed 노출

**Files:**
- Modify: `apps/api/supabase/functions/time-slider-recommender/index.ts`

- [ ] **Step 1: PoiCandidate·Recommendation 타입에 pet 노출**

`Recommendation` 타입(31행)에 필드 추가 (`badges: string[];` 아래):
```ts
  petAllowed: boolean;
```

- [ ] **Step 2: fetchPoiCandidates — 펫 우선 + 부족 시 야외 fallback**

`fetchPoiCandidates`(279행)를 아래로 교체:
```ts
async function fetchPoiCandidates(
  supabase: SupabaseClient,
  origin: Coord,
  radiusKm: number,
): Promise<PoiCandidate[]> {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((origin.lat * Math.PI) / 180));
  const cols =
    'id,name,type,lat,lng,address,image_urls,pet_policy_text,is_wellness,is_eco,pet_allowed,sigungu_code';
  const box = (q: any) =>
    q
      .gte('lat', origin.lat - latDelta)
      .lte('lat', origin.lat + latDelta)
      .gte('lng', origin.lng - lngDelta)
      .lte('lng', origin.lng + lngDelta);

  // 1) 펫동반 가능 우선
  const { data: petData, error: petErr } = await box(
    supabase.from('pois').select(cols).eq('pet_allowed', true),
  ).limit(MAX_CANDIDATES);
  if (petErr) throw petErr;
  const pet = (petData ?? []) as PoiCandidate[];

  // 2) 부족하면 비펫 야외 타입으로 fallback ("한적한 산책지")
  if (pet.length >= TOP_N) return pet;
  const { data: walkData } = await box(
    supabase.from('pois').select(cols).eq('pet_allowed', false).in('type', ['TRAIL', 'PARK', 'ATTRACTION']),
  ).limit(MAX_CANDIDATES - pet.length);
  const walk = (walkData ?? []) as PoiCandidate[];
  return [...pet, ...walk];
}
```

- [ ] **Step 3: 랭킹 — 펫 우선 정렬 + sourceLabel/petAllowed 반영**

scored 정렬(197행) `.sort((a, b) => b.score - a.score)` 를 펫 우선 2차정렬로 교체:
```ts
      .sort((a, b) => {
        if (a.poi.pet_allowed !== b.poi.pet_allowed) return a.poi.pet_allowed ? -1 : 1; // 펫 우선
        return b.score - a.score;
      })
```

recommendations 매핑(204행 이후)에서 `sourceLabel`·`petAllowed` 조정:
- `sourceLabel: s.poi.type === 'TRAIL' ? '두루누비 코스' : '펫동반 가능',` 를
  → `sourceLabel: s.poi.pet_allowed ? '펫 동반 가능' : s.poi.type === 'TRAIL' ? '두루누비 코스' : '한적한 산책지',`
- `badges: ...,` 아래에 추가: `petAllowed: s.poi.pet_allowed,`

- [ ] **Step 4: 타입체크**

Run: `cd apps/api && npx tsc --noEmit 2>&1 | grep -v "esm.sh\|Deno" | head`
Expected: 신규 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add apps/api/supabase/functions/time-slider-recommender/index.ts
git commit -m "feat(api): 추천 펫 우선 + 비펫 야외 fallback (빈결과 방지) + petAllowed 노출"
```

---

## Task 7: Edge ETL(`tour-api-etl`) 버그 수정 — 크론 정합성

**Files:**
- Modify: `apps/api/supabase/functions/tour-api-etl/index.ts`

- [ ] **Step 1: 도시 설정·상수 교체 (법정동)**

`CHUNGNAM_SIGUNGU`(16행)를 법정동 기반으로 교체:
```ts
const LDONG_REGN_CD = 44; // 충청남도
const CHUNGNAM_CITIES = [
  { name: '공주', signgu: [150], sigunguCode: 33020 },
  { name: '천안', signgu: [131, 133], sigunguCode: 33040 },
  { name: '아산', signgu: [200], sigunguCode: 33050 },
  { name: '서산', signgu: [210], sigunguCode: 33150 },
];
```

- [ ] **Step 2: 메인 루프 — 시군구 다중 + 저장코드 매핑**

메인 루프(50행 `for (const sgg of CHUNGNAM_SIGUNGU)`) 를 교체:
```ts
    for (const city of CHUNGNAM_CITIES) {
      const items = (await Promise.all(city.signgu.map((s) => fetchAreaBasedList(s)))).flat();
      for (const item of items) {
        try {
          if (!item.mapx || !item.mapy) continue;
          const existing = await admin
            .from('pois')
            .select('id')
            .eq('source', 'TOUR_API_KOR')
            .eq('source_id', String(item.contentid))
            .maybeSingle();

          const pet = await fetchDetailPetTour(item.contentid);
          const zone = String(pet?.acmpyTypeCd ?? '');
          const row = {
            source: 'TOUR_API_KOR',
            source_id: String(item.contentid),
            content_type_id: Number(item.contenttypeid),
            name: item.title,
            type: CONTENT_TYPE_MAP[Number(item.contenttypeid)] ?? 'ATTRACTION',
            sigungu_code: city.sigunguCode,
            address: item.addr1 ?? null,
            lat: Number(item.mapy),
            lng: Number(item.mapx),
            geohash7: geohash7(Number(item.mapy), Number(item.mapx)),
            image_urls: item.firstimage ? [item.firstimage] : [],
            phone: item.tel ?? null,
            pet_allowed: !!pet,
            pet_indoor: pet ? zone.includes('실내') || zone.includes('전구역') : null,
            pet_outdoor: pet ? zone.includes('실외') || zone.includes('전구역') : null,
            pet_policy_text: pet
              ? [pet.acmpyPsblCpam, pet.acmpyNeedMtr, pet.etcAcmpyInfo].filter(Boolean).join(' / ') || null
              : null,
            last_synced_at: new Date().toISOString(),
          };

          if (existing.data) {
            await admin.from('pois').update(row).eq('id', existing.data.id);
            result.updated++;
          } else {
            await admin.from('pois').insert(row);
            result.added++;
          }
        } catch (e) {
          console.error('item failed', item.contentid, e);
          result.failed++;
        }
      }
    }
```
(기존 `parsePetSize` 참조 제거됨 — 함수 자체는 남겨도 무해하나 미사용)

- [ ] **Step 3: fetchAreaBasedList — 법정동 파라미터**

`fetchAreaBasedList`(130행)를 교체:
```ts
async function fetchAreaBasedList(signgu: number): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = [];
  for (let pageNo = 1; pageNo <= 20; pageNo++) {
    const url = new URL('https://apis.data.go.kr/B551011/KorService2/areaBasedList2');
    url.searchParams.set('serviceKey', TOUR_API_KEY);
    url.searchParams.set('MobileOS', 'ETC');
    url.searchParams.set('MobileApp', 'daengroad');
    url.searchParams.set('_type', 'json');
    url.searchParams.set('arrange', 'C');
    url.searchParams.set('lDongRegnCd', String(LDONG_REGN_CD));
    url.searchParams.set('lDongSignguCd', String(signgu));
    url.searchParams.set('numOfRows', '100');
    url.searchParams.set('pageNo', String(pageNo));
    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'daengroad-etl' } });
    if (!res.ok) throw new Error(`TourAPI ${res.status}`);
    const json = await res.json();
    const items = json.response?.body?.items?.item ?? [];
    const arr = Array.isArray(items) ? items : items ? [items] : [];
    out.push(...arr);
    const total = Number(json.response?.body?.totalCount ?? 0);
    if (out.length >= total || arr.length < 100) break;
  }
  return out;
}
```

- [ ] **Step 4: fetchDetailPetTour → detailPetTour2**

`fetchDetailPetTour`(150행)를 교체:
```ts
async function fetchDetailPetTour(
  contentId: string | number,
): Promise<Record<string, string> | null> {
  const url = new URL('https://apis.data.go.kr/B551011/KorService2/detailPetTour2');
  url.searchParams.set('serviceKey', TOUR_API_KEY);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'daengroad');
  url.searchParams.set('_type', 'json');
  url.searchParams.set('contentId', String(contentId));
  const res = await fetch(url.toString(), { headers: { 'User-Agent': 'daengroad-etl' } });
  if (!res.ok) return null;
  const json = await res.json();
  const item = json.response?.body?.items?.item;
  const first = Array.isArray(item) ? item[0] : item;
  return first && typeof first === 'object' && Object.keys(first).length > 1 ? first : null;
}
```

- [ ] **Step 5: 타입체크 + 커밋**

Run: `cd apps/api && npx tsc --noEmit 2>&1 | grep -v "esm.sh\|Deno" | head`
Expected: 신규 에러 없음.
```bash
git add apps/api/supabase/functions/tour-api-etl/index.ts
git commit -m "fix(api): tour-api-etl 법정동 파라미터 + detailPetTour2 + 펫필드 매핑 (크론 정합)"
```

---

## Task 8: 로컬 Edge 서빙 스크립트 + env-file

**Files:**
- Modify: `package.json` (root), `apps/api/package.json`

- [ ] **Step 1: env-file 확인**

`apps/api/.env` 에 Edge 서빙에 필요한 값(`SB_JWT_SECRET`·`SUPABASE_URL`·`SUPABASE_SERVICE_ROLE_KEY`·`TOUR_API_SERVICE_KEY`, 선택 `KAKAO_REST_API_KEY`/`UPSTASH_*`)이 있는지 확인. 없으면 `apps/web/.env.local` 에서 복사.

Run: `cd apps/api && for k in SB_JWT_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY TOUR_API_SERVICE_KEY; do grep -q "^$k=" .env && echo "$k ok" || echo "$k MISSING"; done`
Expected: 4개 모두 `ok` (SUPABASE_URL 은 로컬 `http://127.0.0.1:54321`).

- [ ] **Step 2: 스크립트 수정**

`apps/api/package.json` 의 `supabase:serve` 교체:
```json
    "supabase:serve": "supabase functions serve --no-verify-jwt --env-file .env",
```
root `package.json` 의 `dev:api` 교체 (apps/api 로 cwd):
```json
    "dev:api": "npm run supabase:serve -w apps/api",
```

- [ ] **Step 3: 서빙 스모크**

Run(백그라운드): `npx supabase functions serve --no-verify-jwt --env-file apps/api/.env` (repo 루트에서 실행 시 `--workdir apps/api` 필요할 수 있음 → apps/api 에서 실행 권장)
Expected: `Serving functions on http://localhost:54321/functions/v1/<fn>` 로그, 크래시 없음.

- [ ] **Step 4: 커밋**

```bash
git add package.json apps/api/package.json
git commit -m "fix(api): dev:api Edge 서빙 cwd+env-file (503 해소)"
```

---

## Task 9: 추천 E2E 통합검증 스크립트

**Files:**
- Create: `apps/api/scripts/verify-recommend.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: verify-recommend.ts 구현**

Create `apps/api/scripts/verify-recommend.ts`:
```ts
// 추천 E2E 검증: Supabase 호환 JWT 발급 → 서빙된 Edge 함수 호출 → 결과 검증.
// 선행: (1) seed:tourapi 적재됨, (2) supabase functions serve 실행중.
// 주의: 추천 함수는 recommendations 에 user_id FK insert 하므로 sub 는 실재 유저여야 함(아니면 500).
import { SignJWT } from 'jose';
import { PrismaClient } from '@prisma/client';

const FN_URL =
  process.env.RECOMMEND_FN_URL ??
  'http://127.0.0.1:54321/functions/v1/time-slider-recommender';
const SECRET = process.env.SB_JWT_SECRET;
if (!SECRET) throw new Error('SB_JWT_SECRET 미설정 (apps/api/.env)');

// 시드된 실재 유저 id 사용 (FK 충족)
const prisma = new PrismaClient();
const user = await prisma.user.findFirst({ select: { id: true } });
await prisma.$disconnect();
if (!user) throw new Error('users 비어있음 — 먼저 npm run seed 로 데모 유저 생성');

const token = await new SignJWT({ role: 'authenticated' })
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setSubject(user.id) // 실재 public.users.id → recommendations FK 충족
  .setAudience('authenticated')
  .setIssuer('supabase')
  .setIssuedAt()
  .setExpirationTime('10m')
  .sign(new TextEncoder().encode(SECRET));

// 공주 시청 근처 출발, 3시간
const body = {
  timeHours: 3,
  startAt: new Date().toISOString(),
  departure: { lat: 36.4555, lng: 127.119 },
};

const res = await fetch(FN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
});
const data = await res.json();
console.log('HTTP', res.status);
const recs = data.recommendations ?? [];
console.log('추천 수:', recs.length);
for (const r of recs) console.log(`  - ${r.name} | ${r.sourceLabel} | petAllowed=${r.petAllowed} | ${r.reason?.distanceKm}km`);

if (res.status !== 200) { console.error('❌ 200 아님'); process.exit(1); }
if (recs.length === 0) { console.error('❌ 빈 결과'); process.exit(1); }
console.log('✅ 통과: 추천 결과 존재');
```

- [ ] **Step 2: package.json 스크립트 추가**

`apps/api/package.json` scripts 에 추가:
```json
    "verify:recommend": "tsx scripts/verify-recommend.ts",
```

- [ ] **Step 3: 검증 실행**

선행: 별도 터미널에서 `cd apps/api && npm run supabase:serve` 실행중이어야 함.
Run: `cd apps/api && npm run verify:recommend`
Expected: `HTTP 200`, `추천 수: 1~3`, 각 항목에 `petAllowed=true` 우선 노출, `✅ 통과`.

- [ ] **Step 4: 커밋**

```bash
git add apps/api/scripts/verify-recommend.ts apps/api/package.json
git commit -m "test(api): 추천 E2E 통합검증 스크립트 (JWT→Edge→결과)"
```

---

## Task 10: API 명세 동기화 (openapi.ts)

**Files:**
- Modify: `apps/web/lib/api-docs/openapi.ts`

- [ ] **Step 1: /tour-api-etl 설명 정정**

`/tour-api-etl` operation description(452행 부근)의 문구를 실제와 일치시킴:
- 기존: `충남 4시(공주 33020·천안 33040·아산 33050·서산 33150) POI를 TourAPI/펫관광 API에서 동기화`
- 변경: `충남 4개 시를 법정동코드(시도 44 + 시군구 150/131·133/200/210)로 KorService2/areaBasedList2 조회 + detailPetTour2 펫 오버레이하여 pois upsert (저장 sigunguCode 는 33020/33040/33050/33150).`

- [ ] **Step 2: Recommendation 스키마에 petAllowed 추가**

`Recommendation` 스키마(566행 부근) properties 에 추가:
```ts
          petAllowed: {
            type: 'boolean',
            description: '펫 동반 가능(TourAPI detailPetTour2 등록). FE "펫 동반 가능" 뱃지. PET_VERIFIED(사용자 검증 뱃지)와 별개.',
          },
```
그리고 `sourceLabel` 의 example/설명을 `'펫 동반 가능' | '한적한 산책지' | '두루누비 코스'` 로 갱신.

- [ ] **Step 3: Poi 스키마 주석 보강**

`Poi` 스키마의 `petAllowed`(649행 부근) description 을 `TourAPI detailPetTour2 등록 여부` 로, `sigunguCode` description 에 `조회는 법정동, 저장은 구 코드 33xxx` 명시.

- [ ] **Step 4: 빌드 확인**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head`
Expected: openapi.ts 관련 신규 타입 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/lib/api-docs/openapi.ts
git commit -m "docs(api): api-docs 실데이터 반영 (tour-api-etl 법정동/detailPetTour2, petAllowed)"
```

---

## Task 11: 최종 E2E 검증 (브라우저) + 정리

- [ ] **Step 1: 전체 스택 기동**

터미널 3개:
1. 로컬 Supabase: `npx supabase start` (미기동 시)
2. Edge 서빙: `cd apps/api && npm run supabase:serve`
3. 웹: `npm run dev:web`

- [ ] **Step 2: 브라우저 수동 검증**

1. `http://localhost:3000/login` → 로그인(구글/네이버 등)
2. 홈에서 "지금 추천받기" 탭
3. 확인: **실제 충남 장소가 리스트로** 뜨고, **펫 동반 가능이 상단**, 빈 결과 아님

- [ ] **Step 3: 회귀 — 단위테스트 재실행**

Run: `cd apps/api && node --import tsx --test prisma/tourapi/transform.test.ts`
Expected: 전부 PASS.

- [ ] **Step 4: DoD 체크 (설계문서 §10)**

- [ ] 로그인 후 "지금 추천받기" → 충남 실 POI 리스트(펫 우선, 빈결과 없음)
- [ ] `pois` 실데이터 + petAllowed 라벨링
- [ ] Edge 로컬 서빙 정상(503 해소), 키 없을 때 폴백 동작(verify:recommend 통과)
- [ ] api-docs 최신화 반영

---

## Self-Review 메모 (계획 작성자)

- **스펙 커버리지**: 설계 §2(Phase1)→Task4/5/6/8, §3(ETL)→Task1/2/3/7, §4(랭킹)→Task6, §6(명세)→Task10, §8(테스트)→Task1/3/9/11. 전부 매핑됨.
- **Deno/Node 분리로 인한 소규모 중복**: 펫필드/도시매핑 로직이 Node(transform.ts)와 Deno(tour-api-etl)에 병존. 런타임(URL import vs npm)이 달라 의도적 허용 — 초기 로드는 Node 시드가 진실원본, Edge 는 크론용. 로직 변경 시 양쪽 동기화 필요(각 Task 에 명시).
- **테스트 전략**: 순수함수=node --test 단위테스트(Task1), 데이터적재=DB count 검증(Task3), 추천=E2E 통합검증(Task9)+브라우저(Task11). Deno 함수는 `deno` CLI 부재로 통합검증 채택.
- **환경 전제**: npx supabase 2.109.1, 로컬 Supabase DB(54322) 기동, TourAPI Node 호출 가능 — 계획작성 시 실측 확인함.
