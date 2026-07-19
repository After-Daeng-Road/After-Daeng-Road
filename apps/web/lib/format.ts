// 표시용 날짜·시간 포매터 · UI 공용 헬퍼 (한국어 로케일)

// HH:MM (24h) — 추천 폼/결과 헤더 등에서 공용 (이전엔 두 곳에 중복 정의)
export function formatHHmm(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// 카카오 길찾기 딥링크 — 추천 카드/장소 상세에서 공용
export function kakaoDirectionsUrl(name: string, lat: number, lng: number): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
}

// 시간 예산(h) → 검색 반경(km). 평균 50km/h · 편도 절반 가정 (DESIGN_SYSTEM §5 TimeSlider)
export function radiusFromHours(timeHours: number): number {
  return Math.round((timeHours / 2) * 50);
}

export function formatDate(d: Date): string {
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '방금';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
