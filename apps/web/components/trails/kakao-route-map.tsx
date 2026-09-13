'use client';

// 카카오맵 위에 두루누비 코스 경로(Polyline)와 출발·도착 마커를 그린다.
// path_geojson 은 GPX 에서 ~100 포인트로 솎은 LineString 이라 그대로 이어도 형태가 충분하다.
// 지도 SDK(dapi.kakao.com)는 NEXT_PUBLIC_KAKAO_JS_KEY 가 있을 때만 로드 — 상위(RoutePreview)가 분기.

import { Map, MapMarker, Polyline, useKakaoLoader } from 'react-kakao-maps-sdk';
import { COPY } from '@/lib/copy';

const T = COPY.trails;

export function KakaoRouteMap({
  appKey,
  points,
}: {
  appKey: string;
  /** [lng, lat][] — GeoJSON 순서 */
  points: [number, number][];
}) {
  const [loading, error] = useKakaoLoader({ appkey: appKey });
  const path = points.map(([lng, lat]) => ({ lat, lng }));
  const start = path[0];
  const end = path[path.length - 1];
  const center = {
    lat: (Math.min(...path.map((p) => p.lat)) + Math.max(...path.map((p) => p.lat))) / 2,
    lng: (Math.min(...path.map((p) => p.lng)) + Math.max(...path.map((p) => p.lng))) / 2,
  };

  if (error) {
    return (
      <p role="alert" className="rounded-field bg-danger-soft px-4 py-3 text-xs text-danger">
        {T.mapLoadError}
      </p>
    );
  }
  if (loading) {
    return <div className="h-full w-full animate-pulse rounded-field bg-surface-2" />;
  }

  return (
    <Map
      center={center}
      level={7}
      className="h-full w-full rounded-field"
      onCreate={(map) => {
        // 코스 전체가 한 화면에 들어오게 — center/level 추정 대신 실제 경계로 맞춘다
        const bounds = new window.kakao.maps.LatLngBounds();
        for (const p of path) bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng));
        map.setBounds(bounds, 24);
      }}
    >
      <Polyline
        path={path}
        strokeWeight={6}
        strokeColor="#ff8a5b"
        strokeOpacity={0.9}
        strokeStyle="solid"
      />
      <MapMarker position={start} title={T.start} />
      <MapMarker position={end} title={T.end} />
    </Map>
  );
}
