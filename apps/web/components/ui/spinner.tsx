'use client';

// 공용 로딩 스피너 — 커스텀 비숑 달리기 애니메이션 (components/ui/bichon).
// 색은 currentColor — 부모 텍스트 색을 따라가서 밝은/어두운 버튼 어디서든 보인다.
// 사용처(로그인·추천·페이지네이션)는 이 컴포넌트만 바라보므로 여기서 일괄 제어한다.

import { BichonSpinner } from './bichon/BichonSpinner';

export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex ${className}`}>
      <BichonSpinner size={size} lineColor="currentColor" fillColor="none" flip label="로딩 중" />
    </span>
  );
}
