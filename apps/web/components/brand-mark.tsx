// 브랜드 마크 — 비숑 아트워크 정적 1프레임 (모션 없음).
// 라인 색 고정: 라이트=검정 / 다크=흰색 (부모 텍스트 색 무시).
// (브라우저 탭 파비콘은 기존 /brand/daengroad-favicon-*.svg 유지 — app/layout.tsx icons)

import { BICHON_RUN_FRAMES, BICHON_VIEWBOX } from './ui/bichon/bichonRunFrames';

// 정지 포즈로 쓸 프레임 — 필요 시 0~7 중 교체
const MARK_FRAME = BICHON_RUN_FRAMES[0];

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${BICHON_VIEWBOX} ${BICHON_VIEWBOX}`}
      aria-hidden
      className={`text-black dark:text-white ${className ?? ''}`}
      style={{ display: 'inline-block' }}
    >
      {/* 좌우 반전 — 달리기 아트가 왼쪽을 봐서 오른쪽(진행 방향)으로 통일 */}
      {/* 아트워크가 viewBox 하단으로 ~22u 치우쳐 y 보정 → 옆 텍스트와 수직 정렬 */}
      <g transform={`translate(${BICHON_VIEWBOX} -22) scale(-1 1)`}>
        <path fill="none" d={MARK_FRAME.fill} />
        <path fill="currentColor" fillRule="evenodd" d={MARK_FRAME.line} />
      </g>
    </svg>
  );
}
