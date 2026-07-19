import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { COPY } from '@/lib/copy';

// 비로그인 사용자에게 노출하는 안내 카드
// 페이지마다 아이콘 · 제목 · 설명 · callbackUrl · CTA 라벨이 다르므로 props 로 주입

export function LoginRequiredCard({
  icon,
  title,
  description,
  callbackUrl,
  ctaLabel = COPY.common.login,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  callbackUrl: string;
  ctaLabel?: string;
  footer?: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="rounded-card border border-line bg-surface p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft">
          {icon}
        </div>
        <h1 className="mt-4 text-lg font-bold text-ink">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="mt-6 inline-flex items-center gap-1.5 rounded-field bg-brand px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover dark:text-[#20160f]"
        >
          <LogIn className="h-4 w-4" aria-hidden /> {ctaLabel}
        </Link>
        {footer && <p className="mt-4 text-[11px] text-faint">{footer}</p>}
      </div>
    </main>
  );
}
