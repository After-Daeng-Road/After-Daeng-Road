import Link from 'next/link';
import { LogIn } from 'lucide-react';

// 비로그인 사용자에게 노출하는 안내 카드
// 페이지마다 아이콘 · 제목 · 설명 · callbackUrl · CTA 라벨이 다르므로 props 로 주입

export function LoginRequiredCard({
  icon,
  title,
  description,
  callbackUrl,
  ctaLabel = '로그인',
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
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-light">
          {icon}
        </div>
        <h1 className="mt-4 text-lg font-bold">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-gray-500">{description}</p>}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-hover"
        >
          <LogIn className="h-4 w-4" aria-hidden /> {ctaLabel}
        </Link>
        {footer && <p className="mt-4 text-[11px] text-gray-400">{footer}</p>}
      </div>
    </main>
  );
}
