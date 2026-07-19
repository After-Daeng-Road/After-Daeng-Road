// 댕로드 — 메인 화면 (서버). listPets() 로 사용자 펫을 조회해 클라이언트 본문에 주입.
// 참조: ui_kits/web 홈 (DESIGN_SYSTEM.md §9.1) — 에디토리얼 quiet-luxury
// 비로그인/펫없음 → listPets 가 [] 반환 → 폼은 "펫 등록하기" 안내 (RecommendForm 처리).

import { listPets } from '@/lib/actions/pets';
import { HomeRecommend } from '@/components/recommend/home-recommend';
import type { Pet } from '@/lib/types/recommendation';

export default async function HomePage() {
  // Prisma Pet(weightKg: Decimal) → 폼이 쓰는 경량 Pet(weightKg: number)로 매핑
  const pets: Pet[] = (await listPets()).map((p) => ({
    id: p.id,
    name: p.name,
    breed: p.breed,
    weightKg: Number(p.weightKg),
    ageYears: p.ageYears,
  }));

  return <HomeRecommend pets={pets} />;
}
