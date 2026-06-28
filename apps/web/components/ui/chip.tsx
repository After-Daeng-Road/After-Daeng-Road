// 추천 카드 등에서 사용하는 작은 라벨 — variant 별 배경/문자 색 + size 별 패딩/폰트

type Variant = 'gray' | 'green' | 'pink' | 'blue' | 'brand';
type Size = 'xs' | 'sm';

// 의미 코드 필 — 색이 데이터 종류를 뜻함 (DESIGN_SYSTEM §5 Chip)
const VARIANT: Record<Variant, string> = {
  gray: 'bg-surface-2 text-body',
  green: 'bg-[color-mix(in_srgb,var(--quiet)_15%,transparent)] text-quiet',
  pink: 'bg-[color-mix(in_srgb,var(--verify)_15%,transparent)] text-verify',
  blue: 'bg-[color-mix(in_srgb,var(--forecast)_15%,transparent)] text-forecast',
  brand: 'bg-brand-soft text-brand-ink',
};

const SIZE: Record<Size, string> = {
  xs: 'gap-0.5 px-1.5 py-0.5 text-[10px]',
  sm: 'gap-1 px-2 py-0.5 text-[11px]',
};

export function Chip({
  children,
  variant = 'gray',
  size = 'sm',
  icon,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center rounded-full ${SIZE[size]} ${VARIANT[variant]}`}>
      {icon}
      {children}
    </span>
  );
}
