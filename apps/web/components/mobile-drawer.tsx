'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { PawPrint, X } from 'lucide-react';
import { COPY } from '@/lib/copy';

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
        aria-label={COPY.header.closeMenu}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="모바일 메뉴"
        className={`absolute right-0 top-0 flex h-full w-64 max-w-[80vw] flex-col bg-surface shadow-lift transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-3.5">
          <span className="inline-flex items-center gap-2 text-[17px] font-bold text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-brand text-white dark:text-ink">
              <PawPrint className="h-4 w-4" aria-hidden />
            </span>
            {COPY.brand.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={COPY.header.closeMenu}
            className="rounded-full p-1.5 text-muted hover:bg-surface-2"
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
                className={`rounded-field px-3 py-3 ${
                  active
                    ? 'bg-brand-soft font-semibold text-brand-ink'
                    : 'text-body hover:bg-surface-2'
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
