'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dog, Menu } from 'lucide-react';
import { MobileDrawer } from './mobile-drawer';

// 전역 헤더 — 로고 + 데스크톱 nav + 모바일 햄버거 트리거
// 드로어 패널 자체는 MobileDrawer 로 분리 (관심사: nav 표면 vs 슬라이드 패널)

const NAV = [
  { href: '/recommendations', label: '추천' },
  { href: '/me', label: '마이페이지' },
  { href: '/login', label: '로그인' },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 라우트 변경 시 드로어 자동 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-brand">
            <Dog className="h-5 w-5" aria-hidden /> 댕로드
          </Link>

          <nav className="hidden items-center gap-4 text-sm text-gray-600 sm:flex">
            {NAV.slice(0, 2).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={
                  pathname === item.href ? 'font-semibold text-gray-900' : 'hover:text-gray-900'
                }
              >
                {item.label}
              </Link>
            ))}
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <Link
              href="/login"
              aria-current={pathname === '/login' ? 'page' : undefined}
              className="font-semibold hover:text-gray-900"
            >
              로그인
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded p-1 sm:hidden"
            aria-label="메뉴 열기"
            aria-expanded={open}
            aria-controls="mobile-drawer"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <MobileDrawer open={open} onClose={() => setOpen(false)} pathname={pathname} nav={NAV} />
    </>
  );
}
