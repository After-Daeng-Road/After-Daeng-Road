'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dog, Menu, X } from 'lucide-react';

const NAV = [
  { href: '/recommendations', label: '추천' },
  { href: '/me', label: '마이페이지' },
  { href: '/login', label: '로그인' },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 라우트 변경 시 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 드로어 열림 시 body scroll lock + Esc 닫기
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

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

      {/* 모바일 드로어 */}
      <div
        className={`fixed inset-0 z-40 sm:hidden ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
          aria-label="메뉴 닫기"
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          id="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="모바일 메뉴"
          className={`absolute right-0 top-0 flex h-full w-64 max-w-[80vw] flex-col bg-white shadow-xl transition-transform duration-200 ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <span className="flex items-center gap-1.5 text-lg font-bold text-brand">
              <Dog className="h-5 w-5" aria-hidden /> 댕로드
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="메뉴 닫기"
              className="rounded p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col p-2 text-sm">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-md px-3 py-3 ${
                    active
                      ? 'bg-brand-light font-semibold text-brand'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
      </div>
    </>
  );
}
