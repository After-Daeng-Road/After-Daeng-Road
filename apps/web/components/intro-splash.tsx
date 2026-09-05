'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, SkipForward } from 'lucide-react';
import { COPY } from '@/lib/copy';

// 홈 진입 인트로 영상 스플래시 — 메인 페이지 위 풀스크린 오버레이.
// 소리 있는 자동재생을 먼저 시도하고, 브라우저가 차단하면 '입장하기' 버튼을 노출
// (클릭 = 사용자 제스처 → 소리 재생 합법). 매 진입 시 표시하되
// '오늘 하루 보지 않기' 체크 시 localStorage 날짜로 숨긴다. 영상 종료/건너뛰기 → 페이드아웃.

const C = COPY.intro;
const HIDE_KEY = 'daeng:intro-hide-date';
const VIDEO_SRC = '/intro/daengroad-intro.mp4';
const POSTER_SRC = '/intro/daengroad-intro-poster.jpg';

const todayStr = () => new Date().toISOString().slice(0, 10);

export function IntroSplash() {
  const [visible, setVisible] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [fading, setFading] = useState(false);
  const [hideToday, setHideToday] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 마운트 후 노출 판단 (SSR 하이드레이션 안전) — 오늘 숨김이면 렌더 자체를 안 함
  useEffect(() => {
    try {
      if (localStorage.getItem(HIDE_KEY) === todayStr()) return;
    } catch {
      /* localStorage 불가 환경이면 그냥 표시 */
    }
    setVisible(true);
  }, []);

  // 표시 중 배경 스크롤 잠금 + 소리 있는 자동재생 시도
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    videoRef.current?.play().catch(() => setNeedsTap(true)); // 차단 → 입장 버튼

    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible) return null;

  const close = () => {
    setFading(true);
    videoRef.current?.pause();
    window.setTimeout(() => setVisible(false), 400); // 페이드아웃 후 제거
  };

  const enter = () => {
    setNeedsTap(false);
    videoRef.current?.play().catch(() => setNeedsTap(true));
  };

  const toggleHideToday = () => {
    const next = !hideToday;
    setHideToday(next);
    try {
      if (next) localStorage.setItem(HIDE_KEY, todayStr());
      else localStorage.removeItem(HIDE_KEY);
    } catch {
      /* 저장 실패 시 이번 진입만 반영 */
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={C.aria}
      className={`fixed inset-0 z-[100] bg-black transition-opacity duration-[400ms] ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        playsInline
        preload="auto"
        onEnded={close}
        className="h-full w-full object-contain"
      />

      {/* 자동재생 차단 시 — 입장 버튼 (클릭 제스처로 소리 재생) */}
      {needsTap && (
        <button
          type="button"
          onClick={enter}
          className="absolute inset-0 grid place-items-center bg-black/40"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-7 py-3.5 text-[15px] font-bold text-[#1d1813] shadow-lift transition hover:scale-105">
            <Play className="h-4 w-4 fill-current" aria-hidden /> {C.enter}
          </span>
        </button>
      )}

      {/* 하단 컨트롤 — 오늘 하루 보지 않기 · 건너뛰기 */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-10">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-white/85">
          <input
            type="checkbox"
            checked={hideToday}
            onChange={toggleHideToday}
            className="h-4 w-4 accent-white"
          />
          {C.hideToday}
        </label>
        <button
          type="button"
          onClick={close}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/35 px-4 py-2 text-[13px] font-medium text-white/95 backdrop-blur-sm transition-colors hover:bg-white/15"
        >
          {C.skip} <SkipForward className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
