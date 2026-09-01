import { Coffee, Landmark, TreePine, Trees, UtensilsCrossed } from 'lucide-react';

// 이미지 없는 POI 카드의 폴백 — 타입별 아이콘 + 은은한 그라디언트 (quiet-luxury).
// 실데이터(시드 POI)엔 이미지가 없는 경우가 많아, 밋밋한 단색 대신 타입이 읽히는 면을 채운다.

type PoiKind = 'CAFE' | 'RESTAURANT' | 'TRAIL' | 'PARK' | 'ATTRACTION';

const ICONS: Record<PoiKind, typeof Coffee> = {
  CAFE: Coffee,
  RESTAURANT: UtensilsCrossed,
  TRAIL: TreePine,
  PARK: Trees,
  ATTRACTION: Landmark,
};

export function PoiImageFallback({
  type,
  iconClassName = 'h-9 w-9',
}: {
  type: PoiKind | string;
  iconClassName?: string;
}) {
  const Icon = ICONS[type as PoiKind] ?? TreePine;
  return (
    <div
      className="absolute inset-0 grid place-items-center bg-gradient-to-br from-surface-2 via-surface-2 to-line-soft"
      aria-hidden
    >
      <Icon className={`${iconClassName} text-faint opacity-70`} strokeWidth={1.25} />
    </div>
  );
}
