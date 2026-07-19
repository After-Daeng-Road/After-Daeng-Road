import type { Config } from 'tailwindcss';

// 댕로드 디자인 시스템 — "절제된 고급(quiet-luxury)" (DESIGN_SYSTEM.md 기준)
// 토큰 값은 app/globals.css 의 CSS 변수(라이트/다크)에 연결되어 테마를 자동으로 따릅니다.
// 살몬 액센트 + 따뜻한 아이보리/차콜 뉴트럴 + 세이지/로즈/슬레이트 데이터 색.

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 브랜드 (살몬)
        brand: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          ink: 'var(--accent-ink)', // 표면 위 액센트 텍스트
          soft: 'var(--accent-soft)', // 칩/틴트 표면
          light: 'var(--accent-soft)',
        },
        // 뉴트럴 · 표면
        page: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        ink: 'var(--ink)', // 솔리드 잉크(버튼/강조 텍스트) — 다크 자동 반전
        line: {
          DEFAULT: 'var(--line)',
          soft: 'var(--line-soft)',
        },
        // 텍스트 램프
        body: 'var(--text)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        // 의미 색 (데이터 전용)
        quiet: 'var(--quiet)',
        verify: 'var(--verify)',
        forecast: 'var(--forecast)',
        // 상태
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
        // CTA 밴드(샌드)
        cta: 'var(--cta-bg)',
        // OAuth
        kakao: '#fee500',
        naver: '#03c75a',
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Newsreader', 'Georgia', 'serif'],
      },
      borderRadius: {
        field: '14px', // 버튼/인풋 (--r-md)
        card: '22px', // 주요 카드/콘솔/히어로 (--r-lg)
      },
      boxShadow: {
        soft: 'var(--shadow)',
        lift: 'var(--shadow-lg)',
      },
      transitionTimingFunction: {
        ds: 'cubic-bezier(.4, 0, .2, 1)',
      },
      letterSpacing: {
        eyebrow: '0.26em',
      },
    },
  },
  plugins: [],
};

export default config;
