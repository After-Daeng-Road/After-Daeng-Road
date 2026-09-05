'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { COPY } from '@/lib/copy';

// 홈 진입 인트로 영상 스플래시 — 메인 페이지 위 풀스크린 오버레이.
// 소리 있는 자동재생을 먼저 시도하고, 브라우저가 차단하면 '입장하기' 버튼을 노출
// (클릭 = 사용자 제스처 → 소리 재생 합법). 영상 종료/건너뛰기 → 페이드아웃.
//
// 노출 규칙 — "사이트에 새로 들어왔을 때"만:
//  · 첫 진입(주소 입력·외부 링크) / 홈에서 새로고침 → 재생
//  · GNB 홈 클릭(SPA 이동), 로그인·로그아웃 리다이렉트 복귀, 뒤로가기 → 재생 안 함
//  · '오늘 하루 보지 않기'(localStorage 날짜) → 항상 숨김
// 판별: Navigation Timing 진입 유형(navigate/reload/back_forward) + 세션 1회 플래그.

const C = COPY.intro;
const HIDE_KEY = 'daeng:intro-hide-date';
const SEEN_KEY = 'daeng:intro-seen'; // sessionStorage — 이 탭 세션에서 이미 봤는지
const VIDEO_SRC = '/intro/daengroad-intro.mp4';
const POSTER_SRC = '/intro/daengroad-intro-poster.jpg';

const todayStr = () => new Date().toISOString().slice(0, 10);

// SPA 라우팅으로 홈이 재마운트돼도 문서 로드당 한 번만 판단
let decidedThisPageLoad = false;

function shouldShowIntro(): boolean {
  try {
    if (localStorage.getItem(HIDE_KEY) === todayStr()) return false;
  } catch {
    /* localStorage 불가 환경이면 계속 진행 */
  }
  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  const navType = nav?.type ?? 'navigate';
  if (navType === 'back_forward') return false; // 뒤로가기
  if (navType === 'reload') return true; // 홈 새로고침은 다시 재생
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false; // 로그인 등 리다이렉트 복귀
  } catch {
    /* sessionStorage 불가 → 표시 */
  }
  return true; // 이 세션의 첫 진입
}

export function IntroSplash() {
  const [visible, setVisible] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 마운트 후 노출 판단 (SSR 하이드레이션 안전)
  useEffect(() => {
    if (decidedThisPageLoad) return; // GNB 등 SPA 재진입 — 판단 자체를 건너뜀
    decidedThisPageLoad = true;
    if (!shouldShowIntro()) return;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* 저장 실패해도 표시엔 지장 없음 */
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
      {/* 영상 + 하단 컨트롤 — 여백 있는 중앙 배치, 컨트롤은 영상 하단 오른쪽 */}
      <div className="grid h-full w-full place-items-center px-5 py-10 sm:px-10 sm:py-14">
        <div className="flex max-h-full max-w-full flex-col">
          {/* 영상 — 재생 대기 오버레이는 영상 영역만 덮어, 아래 컨트롤은 항상 클릭 가능 */}
          <div className="relative min-h-0 flex-1">
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              poster={POSTER_SRC}
              playsInline
              preload="auto"
              onEnded={close}
              className="h-full w-auto max-w-full object-contain shadow-lift"
            />
            {/* 자동재생 차단 시 — 글래스 플레이 버튼 (클릭 제스처로 소리 재생) */}
            {needsTap && (
              <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-[3px]">
                <button
                  type="button"
                  onClick={enter}
                  aria-label={C.enter}
                  className="group relative grid h-[76px] w-[76px] place-items-center"
                >
                  {/* 은은한 펄스 링 */}
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-full bg-white/10 [animation-duration:2600ms]"
                  />
                  <span className="relative grid h-full w-full place-items-center rounded-full bg-white/10 ring-1 ring-white/30 backdrop-blur-md transition duration-300 ease-ds group-hover:scale-105 group-hover:bg-white/20 group-hover:ring-white/50">
                    <Play className="ml-1 h-7 w-7 fill-white text-white" aria-hidden />
                  </span>
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-end gap-6">
            <button
              type="button"
              onClick={hideTodayAndClose}
              className="text-[18px] text-white/85 transition-colors hover:text-brand-hover"
            >
              {C.hideToday}
            </button>
            <button
              type="button"
              onClick={close}
              className="text-[18px] text-white/85 transition-colors hover:text-brand-hover"
            >
              {C.skip}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
