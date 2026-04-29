// 댕로드 시드 데이터 (PRD §11.6, §13.3)
// 충남 4시 sigunguCode 매핑 + 두루누비 카테고리 메타
// 실행: `npm run seed`

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PRD §13.3 — 충남 4시 시드 코드 (areaCode 33)
const CHUNGNAM_SIGUNGU = [
  { code: 33020, name: '공주' },
  { code: 33040, name: '천안' },
  { code: 33050, name: '아산' },
  { code: 33150, name: '서산' },
] as const;

async function main() {
  console.log('🐕 댕로드 시드 시작');

  // ─── 데모 사용자 (개발용) ───
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@daengroad.dev' },
    update: {},
    create: {
      email: 'demo@daengroad.dev',
      nickname: '데모',
      locale: 'ko',
      role: 'user',
    },
  });

  await prisma.pet.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      userId: demoUser.id,
      name: '다람이',
      breed: '푸들',
      weightKg: 5.0,
      ageYears: 3,
      restrictions: [],
    },
  });

  // ─── 충남 4시 시드 POI (TourAPI ETL 전 더미) ───
  for (const sgg of CHUNGNAM_SIGUNGU) {
    console.log(`  ${sgg.name} (${sgg.code}) 시드 중...`);
    // 실제 ETL은 S3 스프린트(6/9~6/22)에 areaBasedList2 + 펫 areaBasedList 호출
    // 지금은 스키마만 확인용으로 비워둠
  }

  console.log('✅ 시드 완료');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
