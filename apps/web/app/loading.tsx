import { LoadingOverlay } from '@/components/ui/loading-overlay';

// 라우트 전환 로딩 (GNB 홈·추천·마이펫타임 등) — 서버 데이터 조회 동안
// 정중앙 비숑 스피너 오버레이. PRD §9 비기능: 즉시 표시되는 로딩 피드백.
export default function Loading() {
  return <LoadingOverlay show />;
}
