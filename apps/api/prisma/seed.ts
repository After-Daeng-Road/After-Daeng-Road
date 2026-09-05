// 댕로드 시드 데이터 (PRD §11.6, §13.3)
// 데모 user/pet + quietness_scores 140행 + 카테고리 배지 자동 부여
//
// POI 는 시드하지 않는다. 실데이터(TourAPI)만 쓴다:
//   npm run seed:tourapi        — 일반 관광정보 950건
//   npm run seed:pet-realdata   — 반려동물 동반여행 83건 (펫 플래그·상세)
// 실행: `npm run seed` (apps/api)

import { PrismaClient, QuietnessSource } from '@prisma/client';

const prisma = new PrismaClient();

// PRD §13.3 — 충남 4시 (areaCode 33) 시드 코드 + 중심 좌표
const CHUNGNAM_SIGUNGU = [
  { code: 33020, name: '공주', lat: 36.4555, lng: 127.119 },
  { code: 33040, name: '천안', lat: 36.8151, lng: 127.1138 },
  { code: 33050, name: '아산', lat: 36.7898, lng: 127.0017 },
  { code: 33150, name: '서산', lat: 36.7848, lng: 126.4503 },
] as const;

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_PET_ID = '00000000-0000-0000-0000-000000000001';
// ⚠ 아래 seedQuietness 가 만드는 값은 공식으로 계산한 합성 기준선이지 실측이 아니다.
// 'DATABANK_VISITOR'(데이터랩 방문자 데이터) 라벨을 붙이면 DB 만 봐서는 구분할 수 없어
// 실측과 뒤섞인다. 실측은 seed-datalab.ts 가 DATABANK_VISITOR 로 적재한다.
const QUIETNESS_SAMPLE_SOURCE: QuietnessSource = 'SYNTHETIC_BASELINE';

// ─── 유틸: geohash7 (Edge Function과 동일 알고리즘) ───
function geohash7(lat: number, lng: number): string {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latR: [number, number] = [-90, 90];
  let lngR: [number, number] = [-180, 180];
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

// ─── 1. 데모 사용자 + 펫 ───
async function seedDemoUser() {
  const baseLat = 36.8151;
  const baseLng = 127.1138; // 천안 중심
  const user = await prisma.user.upsert({
    where: { email: 'demo@daengroad.dev' },
    update: {
      nickname: '데모',
      baseAddress: '충남 천안시',
      baseGeohash7: geohash7(baseLat, baseLng),
    },
    create: {
      id: DEMO_USER_ID,
      email: 'demo@daengroad.dev',
      nickname: '데모',
      locale: 'ko',
      role: 'user',
      baseAddress: '충남 천안시',
      baseGeohash7: geohash7(baseLat, baseLng),
      emailNotifyEnabled: false,
    },
  });

  await prisma.pet.upsert({
    where: { id: DEMO_PET_ID },
    update: { name: '다람이', breed: '푸들', weightKg: 5.0, ageYears: 3 },
    create: {
      id: DEMO_PET_ID,
      userId: user.id,
      name: '다람이',
      breed: '푸들',
      weightKg: 5.0,
      ageYears: 3,
      restrictions: [],
    },
  });

  console.log('  ✓ 데모 user + pet');
  return user;
}

// ─── 3. 한적도 합성 기준선 (key 시간대만 — 4시 × 7 요일 × 5 시간대 = 140행) ─
// 실측이 아니다. 로컬 개발과 데이터랩 미적재 환경의 폴백용이며,
// 운영 값은 seed-datalab.ts 가 DATABANK_VISITOR 로 적재한다.
async function seedQuietness() {
  await prisma.quietnessScore.deleteMany({ where: { source: QUIETNESS_SAMPLE_SOURCE } });

  const KEY_HOURS = [9, 12, 15, 18, 21];
  const now = new Date();
  const data = CHUNGNAM_SIGUNGU.flatMap((sgg) =>
    [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
      KEY_HOURS.map((hour) => {
        // 평일 18시는 낮게(혼잡), 주말은 약간 낮게, 그 외 시간대는 높게
        const isWeekend = weekday === 0 || weekday === 6;
        const isRush = hour === 18;
        const base = isRush ? 55 : isWeekend ? 70 : 80;
        // deterministic noise (sigungu+weekday+hour 조합)
        const noise = ((sgg.code + weekday * 7 + hour) % 15) - 5;
        const score = Math.max(40, Math.min(100, base + noise));
        return {
          sigunguCode: sgg.code,
          weekday,
          hourSlot: hour,
          score,
          source: QUIETNESS_SAMPLE_SOURCE,
          // 관측한 적이 없으므로 표본 크기를 지어내지 않는다 (이전에는 100 을 넣었다)
          sampleSize: null,
          computedAt: now,
        };
      }),
    ),
  );

  await prisma.quietnessScore.createMany({ data });
  console.log(`  ✓ ${data.length}개 quietness_scores`);
}

// ─── 4. 카테고리 배지 자동 부여 (0003 sync_category_badges 함수 호출) ─
async function seedBadges() {
  await prisma.$queryRawUnsafe('SELECT sync_category_badges()');
  const count = await prisma.badge.count();
  console.log(`  ✓ ${count}개 badges (sync_category_badges)`);
}

async function main() {
  console.log('🐕 댕로드 시드 시작');
  await seedDemoUser();
  await seedQuietness();
  await seedBadges();
  console.log('✅ 시드 완료');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
