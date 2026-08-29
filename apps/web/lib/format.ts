// 표시용 날짜·시간 포매터 · UI 공용 헬퍼 (한국어 로케일)

// HH:MM (24h) — 추천 폼/결과 헤더 등에서 공용 (이전엔 두 곳에 중복 정의)
export function formatHHmm(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// 카카오 길찾기 딥링크 — 추천 카드/장소 상세에서 공용
// 카카오 링크 좌표 순서는 "이름,위도(lat),경도(lng)" (공식 web 가이드).
// 출발지(from)가 있으면 from→to 로 경로를 확정, 없으면 도착지(to)만 넘긴다.
export type DeparturePoint = { lat: number; lng: number; label?: string };

export function kakaoDirectionsUrl(
  name: string,
  lat: number,
  lng: number,
  from?: DeparturePoint,
): string {
  const to = `${encodeURIComponent(name)},${lat},${lng}`;
  if (from) {
    const fromLabel = encodeURIComponent(from.label ?? '출발지');
    return `https://map.kakao.com/link/from/${fromLabel},${from.lat},${from.lng}/to/${to}`;
  }
  return `https://map.kakao.com/link/to/${to}`;
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
