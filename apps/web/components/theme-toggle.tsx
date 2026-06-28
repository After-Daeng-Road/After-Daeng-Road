'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// 라이트/다크 토글 — data-theme 속성 + localStorage 영속.
// 초기 테마는 layout 의 무플래시 스크립트가 페인트 전에 설정하므로,
// 여기선 마운트 후 현재 값을 읽어 아이콘만 동기화한다.

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme) ?? 'light';
    setTheme(current);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('daengroad-theme', next);
    } catch {
      /* 프라이빗 모드 등 — 무시 */
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className="grid h-[38px] w-[38px] place-items-center rounded-full border border-line bg-surface text-body transition duration-200 ease-ds hover:-translate-y-px hover:border-faint"
    >
      {/* mounted 전엔 깜빡임 방지 위해 Moon 고정 (서버 마크업과 동일) */}
      {mounted && theme === 'dark' ? (
        <Sun className="h-[17px] w-[17px]" aria-hidden />
      ) : (
        <Moon className="h-[17px] w-[17px]" aria-hidden />
      )}
    </button>
  );
}
