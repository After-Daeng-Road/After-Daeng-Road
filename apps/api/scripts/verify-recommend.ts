// 추천 E2E 검증: Supabase 호환 JWT 발급 → 서빙된 Edge 함수 호출 → 결과 검증.
// 선행: (1) seed:tourapi 적재됨, (2) supabase functions serve 실행중.
// 주의: 추천 함수는 recommendations 에 user_id FK insert 하므로 sub 는 실재 유저여야 함(아니면 500).
// 실행: npm run verify:recommend (apps/api). top-level await 미사용(CJS 트랜스파일 호환) → async main.
import { SignJWT } from 'jose';
import { PrismaClient } from '@prisma/client';

const FN_URL =
  process.env.RECOMMEND_FN_URL ?? 'http://127.0.0.1:54321/functions/v1/time-slider-recommender';

async function main() {
  const SECRET = process.env.SB_JWT_SECRET;
  if (!SECRET) throw new Error('SB_JWT_SECRET 미설정 (apps/api/.env)');

  // 시드된 실재 유저 id 사용 (FK 충족)
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    await prisma.$disconnect();
    throw new Error('users 비어있음 — 먼저 npm run seed 로 데모 유저 생성');
  }

  // 호출 전 이력 건수 — 응답 200 만으로는 영속화를 보장하지 못한다.
  // supabase-js 는 실패해도 예외를 던지지 않고 { error } 를 돌려주므로,
  // 저장이 전부 실패해도 추천 응답은 정상으로 보인다(0014 이전의 실제 버그).
  const before = await prisma.recommendation.count({ where: { userId: user.id } });

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
  const data = (await res.json()) as {
    recommendations?: Array<{
      name: string;
      sourceLabel: string;
      petAllowed: boolean;
      reason?: { distanceKm: number };
    }>;
    error?: string;
  };
  console.log('HTTP', res.status);
  const recs = data.recommendations ?? [];
  console.log('추천 수:', recs.length);
  for (const r of recs)
    console.log(
      `  - ${r.name} | ${r.sourceLabel} | petAllowed=${r.petAllowed} | ${r.reason?.distanceKm}km`,
    );

  if (res.status !== 200) {
    console.error('❌ 200 아님:', JSON.stringify(data));
    await prisma.$disconnect();
    process.exit(1);
  }
  if (recs.length === 0) {
    console.error('❌ 빈 결과');
    await prisma.$disconnect();
    process.exit(1);
  }

  // 영속화 검증 — offset 0 요청이므로 이력이 정확히 1건 늘어야 한다
  const after = await prisma.recommendation.count({ where: { userId: user.id } });
  await prisma.$disconnect();
  console.log(`recommendations: ${before} → ${after}`);
  if (after !== before + 1) {
    console.error(`❌ 이력 미기록 — ${before + 1}건이어야 하는데 ${after}건. Edge 저장 실패 의심`);
    process.exit(1);
  }

  console.log('✅ 통과: 추천 결과 존재 + 이력 1건 기록');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
