// 댕로드 — 펫 동반 오버레이 백필 (기존 TourAPI POI 의 petAllowed/펫필드만 갱신).
// 용도: 초기 적재(seed-tourapi) 시 data.go.kr 일일한도(1000/일) 초과로 detailPetTour2 가 429 나면
//       petAllowed 가 전부 0 이 된다. 한도가 리셋된 뒤(자정 KST) 이 스크립트로 펫 필드만 재호출한다.
//       POI 목록(areaBasedList2)은 재호출하지 않아 호출량이 절반이다.
// 실행: npm run seed:pet-overlay (apps/api)
import { PrismaClient } from '@prisma/client';
import { parsePetFields } from './tourapi/transform.ts';
import { fetchDetailPetTour } from './tourapi/client.ts';

const prisma = new PrismaClient();

// 프리플라이트: 429(한도소진)면 전부 false 로 덮어쓰는 사고를 막고 즉시 중단.
async function quotaOk(): Promise<boolean> {
  const key = process.env.TOUR_API_SERVICE_KEY;
  const u = new URL('https://apis.data.go.kr/B551011/KorService2/detailPetTour2');
  for (const [k, v] of Object.entries({
    MobileOS: 'ETC',
    MobileApp: 'daengroad',
    _type: 'json',
    serviceKey: key ?? '',
    contentId: '125891',
  }))
    u.searchParams.set(k, String(v));
  const res = await fetch(u.toString(), { headers: { 'User-Agent': 'daengroad' } });
  return res.status !== 429;
}

async function main() {
  if (!(await quotaOk())) {
    console.error('❌ data.go.kr 일일한도 소진(429). 자정(KST) 리셋 후 다시 실행하세요.');
    process.exit(2);
  }

  const pois = await prisma.poi.findMany({
    where: { source: 'TOUR_API_KOR' },
    select: { id: true, sourceId: true },
  });
  console.log(`대상 POI ${pois.length}건 — 펫 오버레이 시작`);

  let pet = 0;
  let failed = 0;
  for (const poi of pois) {
    try {
      const detail = await fetchDetailPetTour(poi.sourceId);
      const f = parsePetFields(detail);
      await prisma.poi.update({
        where: { id: poi.id },
        data: {
          petAllowed: f.petAllowed,
          petIndoor: f.petIndoor,
          petOutdoor: f.petOutdoor,
          petPolicyText: f.petPolicyText,
          petSizeMaxKg: f.petSizeMaxKg,
          lastSyncedAt: new Date(),
        },
      });
      if (f.petAllowed) pet++;
    } catch (e) {
      failed++;
      console.error('  실패', poi.sourceId, (e as Error).message);
    }
  }
  console.log(`\n펫 오버레이 완료: petAllowed ${pet}건 / 실패 ${failed}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
