// 댕로드 — TourAPI 실데이터 초기 적재 (충남 4개 시). 실행: npm run seed:tourapi
// Edge tour-api-etl(크론)과 동일 로직의 Node 판. 초기 로드는 tsx+Prisma 가 안정적.
import { PrismaClient } from '@prisma/client';
import { CHUNGNAM_CITIES, buildPoiInput } from './tourapi/transform.ts';
import { fetchAreaBasedList, fetchDetailPetTour } from './tourapi/client.ts';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  let added = 0,
    updated = 0,
    pet = 0,
    failed = 0;

  // 초기 로드: 기존 TourAPI 소스 POI 정리 후 실데이터로 교체 (quietness 는 sigunguCode 기준이라 보존)
  await prisma.poi.deleteMany({ where: { source: 'TOUR_API_KOR' } });

  for (const city of CHUNGNAM_CITIES) {
    const items = (await Promise.all(city.signgu.map((s) => fetchAreaBasedList(s)))).flat();
    console.log(`[${city.name}] POI ${items.length}건 수집`);
    for (const item of items) {
      try {
        if (!item.mapx || !item.mapy) {
          continue;
        } // 좌표 없는 항목 skip
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
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
