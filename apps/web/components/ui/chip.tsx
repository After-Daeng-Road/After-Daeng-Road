// 추천 카드 등에서 사용하는 작은 라벨 — variant 별 배경/문자 색 + size 별 패딩/폰트

type Variant = 'gray' | 'green' | 'pink';
type Size = 'xs' | 'sm';

const VARIANT: Record<Variant, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-700',
  pink: 'bg-pink-100 text-pink-700',
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
