'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
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

  // '오늘 하루 보지 않기' — 날짜 저장 후 즉시 닫기
  const hideTodayAndClose = () => {
    try {
      localStorage.setItem(HIDE_KEY, todayStr());
    } catch {
      /* 저장 실패 시 이번 진입만 닫힘 */
    }
    close();
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
      {/* 영상 — 꽉 채우지 않고 여백 있는 중앙 배치 */}
      <div className="grid h-full w-full place-items-center px-5 py-14 sm:px-10 sm:py-16">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          playsInline
          preload="auto"
          onEnded={close}
          className="max-h-full w-auto max-w-full rounded-2xl shadow-lift"
        />
      </div>

      {/* 자동재생 차단 시 — 브랜드 로고 + 플레이 (클릭 제스처로 소리 재생) */}
      {needsTap && (
        <button
          type="button"
          onClick={enter}
          aria-label={C.enter}
          className="group absolute inset-0 grid place-items-center bg-black/50"
        >
          <span className="flex flex-col items-center gap-3">
            <span
              aria-hidden
              className="inline-block h-[30px] w-[30px] bg-[url('/brand/daengroad-favicon-ivory.svg')] bg-contain bg-center bg-no-repeat dark:bg-[url('/brand/daengroad-favicon-dark.svg')]"
            />
            <Play
              className="h-6 w-6 fill-white/90 text-white/90 transition-transform group-hover:scale-110"
              aria-hidden
            />
          </span>
        </button>
      )}

      {/* 하단 컨트롤 — 텍스트 버튼 (보더 없음, 호버) */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-8">
        <button
          type="button"
          onClick={hideTodayAndClose}
          className="text-[13px] text-white/60 transition-colors hover:text-white"
        >
          {C.hideToday}
        </button>
        <button
          type="button"
          onClick={close}
          className="text-[13px] text-white/60 transition-colors hover:text-white"
        >
          {C.skip}
        </button>
      </div>
    </div>
  );
}
