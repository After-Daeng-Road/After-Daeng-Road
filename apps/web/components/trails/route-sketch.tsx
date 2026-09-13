// 경로 스케치 — 지도 타일 없이 좌표 점만 이어 그린 SVG.
// 카카오 JS 키가 없을 때의 미리보기 폴백. 형태·방향만 보여주는 참고용이라 축척·지명은 없다.
// 위도에 따라 경도 1도의 실제 길이가 달라지므로 cos(lat) 로 가로를 보정해 모양이 찌그러지지 않게 한다.

import { COPY } from '@/lib/copy';

const T = COPY.trails;
const W = 640;
const H = 400;
const PAD = 28;

/** [lng, lat][] → 뷰박스 좌표 문자열 + 시작·끝 점 */
function project(points: [number, number][]) {
  const lats = points.map((p) => p[1]);
  const lngs = points.map((p) => p[0]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);

  const spanX = Math.max((maxLng - minLng) * kx, 1e-6);
  const spanY = Math.max(maxLat - minLat, 1e-6);
  // 가로·세로 중 더 빡빡한 쪽에 맞춰 같은 배율로 — 비율 보존
  const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
  const offX = (W - spanX * scale) / 2;
  const offY = (H - spanY * scale) / 2;

  const xy = points.map(([lng, lat]) => [
    offX + (lng - minLng) * kx * scale,
    // SVG 는 y 가 아래로 커진다 — 북쪽이 위로 가게 뒤집는다
    offY + (maxLat - lat) * scale,
  ]);
  return { d: xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '), xy };
}

export function RouteSketch({ points }: { points: [number, number][] }) {
  if (points.length < 2) return null;
  const { d, xy } = project(points);
  const [sx, sy] = xy[0];
  const [ex, ey] = xy[xy.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={T.sketchAria}
      className="h-full w-full rounded-field bg-surface-2"
    >
      {/* 은은한 격자 — 빈 배경이 아니라 "도면"으로 읽히게 */}
      <defs>
        <pattern id="route-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="var(--line-soft)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#route-grid)" />

      <polyline
        points={d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 출발 · 도착 */}
      <circle cx={sx} cy={sy} r="8" fill="var(--quiet)" stroke="var(--surface)" strokeWidth="3" />
      <circle cx={ex} cy={ey} r="8" fill="var(--verify)" stroke="var(--surface)" strokeWidth="3" />
      <text
        x={sx}
        y={sy - 14}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="var(--quiet)"
      >
        {T.start}
      </text>
      <text
        x={ex}
        y={ey - 14}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="var(--verify)"
      >
        {T.end}
      </text>
    </svg>
  );
}
