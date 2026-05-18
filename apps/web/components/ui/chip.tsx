// 추천 카드 등에서 사용하는 작은 라벨 — variant 별 배경/문자 색만 다름

export function Chip({
  children,
  variant = 'gray',
  icon,
}: {
  children: React.ReactNode;
  variant?: 'gray' | 'green' | 'pink';
  icon?: React.ReactNode;
}) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    pink: 'bg-pink-100 text-pink-700',
  }[variant];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${colors}`}
    >
      {icon}
      {children}
    </span>
  );
}
