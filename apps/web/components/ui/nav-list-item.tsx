import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

// 마이페이지 · 설정 등에서 사용하는 "원형 아이콘 + 타이틀 + 서브타이틀 + 오른쪽 ChevronRight" 행
// disabled 일 때는 Link 대신 div (cursor-not-allowed + opacity-50)

export function NavListItem({
  href,
  icon,
  title,
  subtitle,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium text-ink">{title}</span>
        {subtitle && <span className="block text-[11px] text-muted">{subtitle}</span>}
      </span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-faint" aria-hidden />
    </>
  );

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 opacity-50"
      >
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand"
    >
      {inner}
    </Link>
  );
}
