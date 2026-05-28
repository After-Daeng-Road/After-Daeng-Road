// 댕로드 시드 데이터 (PRD §11.6, §13.3)
// 데모 user/pet + 충남 4시 POI 20개 + quietness_scores 140행 + 카테고리 배지 자동 부여
// 실행: `npm run seed` (apps/api)

import { PrismaClient, PoiType, SyncSource, QuietnessSource } from '@prisma/client';

const prisma = new PrismaClient();

// PRD §13.3 — 충남 4시 (areaCode 33) 시드 코드 + 중심 좌표
const CHUNGNAM_SIGUNGU = [
  { code: 33020, name: '공주', lat: 36.4555, lng: 127.119 },
  { code: 33040, name: '천안', lat: 36.8151, lng: 127.1138 },
  { code: 33050, name: '아산', lat: 36.7898, lng: 127.0017 },
  { code: 33150, name: '서산', lat: 36.7848, lng: 126.4503 },
] as const;

// 시·군별 5개 POI 템플릿 (deterministic offsets로 재실행 가능)
const POI_TEMPLATES: Array<{
  suffix: string;
  type: PoiType;
  petAllowed: boolean;
  petIndoor: boolean;
  petOutdoor: boolean;
  isWellness: boolean;
  isEco: boolean;
  dlat: number;
  dlng: number;
}> = [
  {
    suffix: '댕댕 카페',
    type: 'CAFE',
    petAllowed: true,
    petIndoor: true,
    petOutdoor: true,
    isWellness: false,
    isEco: false,
    dlat: 0.012,
    dlng: 0.012,
  },
  {
    suffix: '북카페',
    type: 'CAFE',
    petAllowed: true,
    petIndoor: true,
    petOutdoor: false,
    isWellness: false,
    isEco: false,
    dlat: -0.012,
    dlng: 0.012,
  },
  {
    suffix: '한식당',
    type: 'RESTAURANT',
    petAllowed: false,
    petIndoor: false,
    petOutdoor: true,
    isWellness: false,
    isEco: false,
    dlat: 0.012,
    dlng: -0.012,
  },
  {
    suffix: '하천 산책로',
    type: 'TRAIL',
    petAllowed: true,
    petIndoor: false,
    petOutdoor: true,
    isWellness: false,
    isEco: true,
    dlat: -0.012,
    dlng: -0.012,
  },
  {
    suffix: '치유의 숲',
    type: 'PARK',
    petAllowed: true,
    petIndoor: false,
    petOutdoor: true,
    isWellness: true,
    isEco: true,
    dlat: 0,
    dlng: 0,
  },
];

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000';
const DEMO_PET_ID = '00000000-0000-0000-0000-000000000001';
const SEED_SOURCE: SyncSource = 'USER_UGC';
const QUIETNESS_SAMPLE_SOURCE: QuietnessSource = 'DATABANK_VISITOR';

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

// ─── 2. 충남 4시 POI ─ (시·군별 5개 × 4시 = 20) ─
async function seedPois() {
  // 기존 시드 POI 정리 (source=USER_UGC 만)
  await prisma.poi.deleteMany({ where: { source: SEED_SOURCE } });

  let count = 0;
  for (const sgg of CHUNGNAM_SIGUNGU) {
    for (let i = 0; i < POI_TEMPLATES.length; i++) {
      const tpl = POI_TEMPLATES[i];
      const lat = sgg.lat + tpl.dlat;
      const lng = sgg.lng + tpl.dlng;

      await prisma.poi.create({
        data: {
          source: SEED_SOURCE,
          sourceId: `seed-${sgg.code}-${i + 1}`,
          name: `${sgg.name} ${tpl.suffix}`,
          type: tpl.type,
          sigunguCode: sgg.code,
          address: `충남 ${sgg.name}시 시드 ${i + 1}`,
          lat,
          lng,
          geohash7: geohash7(lat, lng),
          imageUrls: [],
          intro: `${sgg.name}의 ${tpl.suffix} — 데모 시드 데이터`,
          petAllowed: tpl.petAllowed,
          petIndoor: tpl.petAllowed ? tpl.petIndoor : null,
          petOutdoor: tpl.petAllowed ? tpl.petOutdoor : null,
          petPolicyText: tpl.petAllowed ? '리드줄 필수, 화장실 OK' : '펫 미동반',
          isWellness: tpl.isWellness,
          isEco: tpl.isEco,
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }
  }
  console.log(
    `  ✓ ${count}개 POI (${CHUNGNAM_SIGUNGU.length} 시 × ${POI_TEMPLATES.length} 템플릿)`,
  );
}

// ─── 3. 한적도 점수 (key 시간대만 — 4시 × 7 요일 × 5 시간대 = 140행) ─
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
          sampleSize: 100,
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
  await seedPois();
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
