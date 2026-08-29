'use client';

import { useEffect, useState } from 'react';
import { Navigation } from 'lucide-react';
import { COPY } from '@/lib/copy';
import { kakaoDirectionsUrl, type DeparturePoint } from '@/lib/format';

// 상세 페이지 길찾기 버튼 — 홈 검색 시 세션에 저장된 출발지를 읽어 출발→도착 경로로
// 카카오맵을 연다. 출발지가 없으면(딥링크 직접 진입 등) 도착지만 넘긴다.
export function KakaoDirectionsButton({
  name,
  lat,
  lng,
}: {
  name: string;
  lat: number;
  lng: number;
}) {
  const [departure, setDeparture] = useState<DeparturePoint | undefined>(undefined);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('daeng:recommend');
      if (!saved) return;
      const parsed = JSON.parse(saved) as { departure?: DeparturePoint };
      if (parsed.departure) setDeparture(parsed.departure);
    } catch {
      /* 손상된 값이면 무시 */
    }
  }, []);

  return (
    <a
      href={kakaoDirectionsUrl(name, lat, lng, departure)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-field bg-brand px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-hover dark:text-[#20160f]"
    >
      <Navigation className="h-4 w-4" aria-hidden /> {COPY.poi.kakao}
    </a>
  );
}
