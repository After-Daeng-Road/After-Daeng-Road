import Link from 'next/link';
import { COPY } from '@/lib/copy';

// 전역 푸터 — 이용약관·개인정보처리방침 링크 + 저작권 (quiet-luxury: 라인 위 절제된 캡션)

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-2 px-5 py-8 text-[12px] text-faint sm:flex-row sm:justify-between sm:px-8 lg:px-14">
        <p>
          © 2026 {COPY.brand.name}. {COPY.footer.rights}
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/legal/terms" className="transition-colors hover:text-body">
            {COPY.common.terms}
          </Link>
          <span className="text-line" aria-hidden>
            |
          </span>
          <Link href="/legal/privacy" className="transition-colors hover:text-body">
            {COPY.common.privacy}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
