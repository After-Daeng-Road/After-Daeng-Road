'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Dog, X } from 'lucide-react';

// 모바일 햄버거에서 열리는 우측 슬라이드 드로어
// 관심사: 패널 마크업 + 슬라이드 애니메이션 + scroll lock + Esc 닫기
// open 상태와 NAV 항목은 부모(SiteHeader)에서 주입

type NavItem = { href: string; label: string };

export function MobileDrawer({
  open,
  onClose,
  pathname,
  nav,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string | null;
  nav: readonly NavItem[];
}) {
  // body scroll lock + Esc 닫기 — 드로어가 열린 동안만
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 sm:hidden ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
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
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="rounded p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col p-2 text-sm">
          {nav.map((item) => {
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
  );
}
