'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, PawPrint } from 'lucide-react';
import { MobileDrawer } from './mobile-drawer';
import { ThemeToggle } from './theme-toggle';
import { COPY } from '@/lib/copy';
import { NAV_ITEMS } from '@/lib/constants';

// 전역 헤더 — sticky + 블러 반투명 캔버스. PawPrint 라운드 사각형 마크 + 워드마크
// + 데스크톱 nav + 테마 토글 + 잉크 로그인 pill. 모바일은 햄버거 → MobileDrawer.

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 라우트 변경 시 드로어 자동 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-line-soft bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] px-5 py-4 backdrop-blur-md backdrop-saturate-[1.1] sm:px-8 lg:px-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[18px] font-bold tracking-[-0.01em] text-ink"
        >
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-brand text-white dark:text-ink">
            <PawPrint className="h-[17px] w-[17px]" aria-hidden />
          </span>
          {COPY.brand.name}
        </Link>

        <nav className="hidden items-center gap-[30px] md:flex">
          {NAV_ITEMS.slice(0, 3).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'text-sm font-medium text-ink'
                    : 'text-sm font-medium text-muted transition-colors hover:text-ink'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden rounded-full border border-ink bg-ink px-5 py-[9px] text-[13.5px] font-semibold text-page transition-opacity duration-200 ease-ds hover:opacity-85 sm:inline-block"
          >
            {COPY.header.login}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-[38px] w-[38px] place-items-center rounded-full border border-line bg-surface text-body md:hidden"
            aria-label={COPY.header.openMenu}
            aria-expanded={open}
            aria-controls="mobile-drawer"
          >
            <Menu className="h-[17px] w-[17px]" />
          </button>
        </div>
      </header>

      <MobileDrawer
        open={open}
        onClose={() => setOpen(false)}
        pathname={pathname}
        nav={NAV_ITEMS}
      />
    </>
  );
}
