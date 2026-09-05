'use client';

// 전면 로딩 오버레이 — API 호출 중 화면 정중앙에 비숑 스피너를 띄운다.
// 은은한 스크림 + surface 원판 위에 달리는 비숑 (라이트/다크 토큰 대응).

import { BichonSpinner } from './bichon/BichonSpinner';

export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[90] grid place-items-center bg-black/20 backdrop-blur-[2px]"
    >
      {/* 다크모드 무관 흰 원 + 검정 라인 고정. 아트워크가 viewBox 하단으로 ~6% 치우쳐 translateY 로 시각 중심 보정 */}
      <div className="grid h-36 w-36 place-items-center rounded-full bg-white shadow-lift">
        <BichonSpinner
          size={100}
          lineColor="#000000"
          fillColor="none"
          flip
          label="로딩 중"
          style={{ transform: 'translate(2%, -6%)' }}
        />
      </div>
    </div>
  );
}
