// 댕로드 — 반려동물 동반여행 서비스(KorPetTourService2) 실데이터 백필.
// 실행: npm run seed:pet-realdata (apps/api)
//
// 배경: 기존 seed-tourapi 는 일반 관광정보 950건을 적재한 뒤 건별로 "펫 되나요"를 되물었다.
//       950회 호출이 일일한도(1000)를 넘겼고, client.ts 의 catch 가 실패를 삼켜
//       전부 petAllowed=false 로 저장됐다 (실제 DB 확인 결과 0건).
//
// 이 스크립트는 펫 전용 서비스의 "펫 동반 가능 목록"(충남 4시 83건)을 받아
// 이미 적재된 POI 에 플래그와 상세를 덮어쓴다. 호출량 약 254회.
//
// 멱등: 재실행해도 같은 결과. 중간 실패 시 그 지점까지는 DB 에 반영돼 있고 재실행하면 이어진다.
import { PrismaClient } from '@prisma/client';
import {
  CHUNGNAM_CITIES,
  buildPoiInput,
  parsePetFields,
  parseHomepage,
  cleanOverview,
  mergeImageUrls,
  type TourItem,
} from './tourapi/transform.ts';
import {
  fetchPetPoiList,
  fetchPetDetail,
  fetchPetImages,
  fetchPetCommon,
} from './tourapi/pet-client.ts';

const prisma = new PrismaClient();

type Stats = { matched: number; created: number; skipped: number; images: number; intro: number };

async function backfillOne(item: TourItem, sigunguCode: number, now: Date, s: Stats) {
  const sourceId = String(item.contentid);

  // 좌표 없는 항목은 추천 반경 계산이 불가 → 건너뜀
  if (!item.mapx || !item.mapy) {
    s.skipped++;
    console.log(`  - ${item.title} (좌표 없음)`);
    return;
  }

  // 상세 3종. 실패하면 예외가 위로 올라가 전체가 중단된다 (false 로 덮어쓰지 않기 위함)
  const [pet, images, common] = await Promise.all([
    fetchPetDetail(sourceId),
    fetchPetImages(sourceId),
    fetchPetCommon(sourceId),
  ]);

  const petFields = parsePetFields(pet);
  // 이 목록에 있다는 것 자체가 펫 동반 가능. 상세가 비어도 true 를 유지한다.
  petFields.petAllowed = true;

  const existing = await prisma.poi.findUnique({
    where: { source_sourceId: { source: 'TOUR_API_KOR', sourceId } },
    select: { id: true, imageUrls: true },
  });

  const firstImage = item.firstimage ? [item.firstimage] : [];
  const intro = cleanOverview(common?.overview);
  const homepage = parseHomepage(common?.homepage);

  if (existing) {
    const merged = mergeImageUrls([...existing.imageUrls, ...firstImage], images);
    await prisma.poi.update({
      where: { id: existing.id },
      data: {
        ...petFields,
        imageUrls: merged,
        intro,
        homepage,
        category1: common?.cat1?.trim() || null,
        category2: common?.cat2?.trim() || null,
        category3: common?.cat3?.trim() || null,
        ldongCode: common?.lDongSignguCd?.trim() || null,
        lastSyncedAt: now,
      },
    });
    s.matched++;
    if (merged.length > 0) s.images++;
    if (intro) s.intro++;
  } else {
    // 기존 950건에 없는 펫 POI (일반 목록 수집 시점 이후 신규 등록 등)
    const row = buildPoiInput(item, pet, sigunguCode, now);
    await prisma.poi.create({
      data: {
        ...row,
        petAllowed: true,
        imageUrls: mergeImageUrls(firstImage, images),
        intro,
        homepage,
        category1: common?.cat1?.trim() || null,
        category2: common?.cat2?.trim() || null,
        category3: common?.cat3?.trim() || null,
        ldongCode: common?.lDongSignguCd?.trim() || null,
      },
    });
    s.created++;
  }
}

async function main() {
  const now = new Date();
  const s: Stats = { matched: 0, created: 0, skipped: 0, images: 0, intro: 0 };
  let calls = 0;

  console.log('🐕 반려동물 동반여행 서비스(KorPetTourService2) 백필 시작\n');

  for (const city of CHUNGNAM_CITIES) {
    const lists = await Promise.all(city.signgu.map((sg) => fetchPetPoiList(sg)));
    calls += city.signgu.length;
    const items = lists.flat();
    console.log(`[${city.name}] 펫 동반 POI ${items.length}건`);

    for (const item of items) {
      await backfillOne(item, city.sigunguCode, now, s);
      calls += 3;
    }
  }

  console.log(
    `\n✅ 완료 — 기존 갱신 ${s.matched} / 신규 ${s.created} / 건너뜀 ${s.skipped}` +
      `\n   이미지 보유 ${s.images}, 소개글 ${s.intro}, API 호출 약 ${calls}회`,
  );

  const total = await prisma.poi.count({ where: { source: 'TOUR_API_KOR', petAllowed: true } });
  console.log(`   DB 확인: pet_allowed=true 인 실데이터 POI ${total}건`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('\n❌ 중단:', (e as Error).message);
    console.error('   (한도 소진이면 자정(KST) 이후 재실행하세요. 진행분은 DB 에 남아 있습니다)');
    await prisma.$disconnect();
    process.exit(1);
  });
