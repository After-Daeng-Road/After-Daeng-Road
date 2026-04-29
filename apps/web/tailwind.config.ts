import type { Config } from 'tailwindcss';

// 댕로드 디자인 시스템 (UI 기획서 v0.1 기반)
// Primary: #f56500 (오렌지), CTA 배경: #fff8e1 (연노랑)

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f56500',
          hover: '#e65a00',
          light: '#fff5f0',
        },
        cta: '#fff8e1',
        // 한적도 칩 / 검증 칩 / 예측 라벨
        quietness: '#22c55e',
        verified: '#ec4899',
        forecast: '#0d6efd',
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          '"Helvetica Neue"',
          '"Apple SD Gothic Neo"',
          '"Malgun Gothic"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
