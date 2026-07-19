'use client';

import { useEffect, useState } from 'react';
import { formatHHmm } from '@/lib/format';

// 현재 시각(HH:MM) 라벨 — 마운트 후에만 채워 하이드레이션 미스매치 방지.
// SSR/클라이언트 첫 렌더는 빈 문자열(동일) → 이후 클라이언트에서 현재 시각으로 갱신.
export function NowLabel() {
  const [now, setNow] = useState('');
  useEffect(() => {
    setNow(formatHHmm(new Date()));
  }, []);
  return <>{now}</>;
}
