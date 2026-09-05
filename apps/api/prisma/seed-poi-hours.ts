// 댕로드 — POI 운영시간 백필 (TourAPI detailIntro2).
// 실행: npm run seed:poi-hours [최대건수]
//
// 왜: 추천이 운영시간을 전혀 보지 않아 밤 9시에 문 닫은 곳을 추천할 수 있었다.
//     한적도는 공개 API 에 시간대 데이터가 없어 규칙에 의존하지만, "지금 문을 열었는가"는
//     detailIntro2 로 실데이터 판정이 가능하다.
//
// 대상: 추천 후보가 되는 관광지(12)·레포츠(28). 쇼핑(38)은 추천에서 빠지므로 제외.
// 멱등: use_time_text 가 이미 있는 POI 는 건너뛴다 → 한도에 걸려 중단돼도 재실행하면 이어진다.
import { PrismaClient } from '@prisma/client';
import { pickIntroFields, parseUseTime } from './tourapi/transform.ts';
import { fetchIntro } from './tourapi/client.ts';

const prisma = new PrismaClient();

const TARGET_CONTENT_TYPES = [12, 28]; // 관광지 · 레포츠

async function main() {
  const limit = Number(process.argv[2]) || Number.MAX_SAFE_INTEGER;

  const targets = await prisma.poi.findMany({
    where: {
      source: 'TOUR_API_KOR',
      contentTypeId: { in: TARGET_CONTENT_TYPES },
      useTimeText: null,
    },
    select: { id: true, sourceId: true, name: true, contentTypeId: true },
    orderBy: [{ petAllowed: 'desc' }, { name: 'asc' }], // 펫 등록부터 (추천 노출 우선)
    take: limit === Number.MAX_SAFE_INTEGER ? undefined : limit,
  });

  console.log(`🕘 운영시간 백필 — 대상 ${targets.length}건\n`);
  if (targets.length === 0) {
    console.log('   채울 것이 없습니다 (모두 처리됨).');
    return;
  }

  let filled = 0,
    parsed = 0,
    empty = 0;

  for (const t of targets) {
    // 실패는 throw 되어 여기서 중단된다 — 한도 소진을 "정보 없음"으로 저장하지 않기 위함
    const intro = await fetchIntro(t.sourceId, t.contentTypeId ?? 12);
    const fields = pickIntroFields(intro);
    const { openFrom, openTo } = parseUseTime(fields.useTimeText);

    if (!fields.useTimeText && !fields.restDateText && !fields.parkingText && !fields.infoCenter) {
      empty++;
      continue; // 저장할 것이 없으면 use_time_text 를 null 로 두어 다음 실행에서 재시도
    }

    await prisma.poi.update({
      where: { id: t.id },
      data: { ...fields, openFrom, openTo },
    });
    filled++;
    if (openFrom !== null) parsed++;
  }

  console.log(
    `\n✅ 완료 — 저장 ${filled} / 시각 파싱 성공 ${parsed} / 응답 비어있음 ${empty}` +
      `\n   API 호출 ${targets.length}회`,
  );

  const remaining = await prisma.poi.count({
    where: {
      source: 'TOUR_API_KOR',
      contentTypeId: { in: TARGET_CONTENT_TYPES },
      useTimeText: null,
    },
  });
  console.log(`   남은 대상: ${remaining}건`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('\n❌ 중단:', (e as Error).message);
    console.error('   (한도 소진이면 자정(KST) 이후 재실행하세요. 진행분은 DB 에 남습니다)');
    await prisma.$disconnect();
    process.exit(1);
  });
