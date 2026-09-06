'use client';

// 로그인/로그아웃 토스트 — OAuth 리다이렉트·signOut 은 전체 리로드를 동반하므로
// 세션 상태를 sessionStorage 에 남겨 "이전 방문 상태와 달라졌을 때"만 토스트를 띄운다.
// 첫 방문(이전 상태 없음)에는 조용히 현재 상태만 기록한다.

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/toast';
import { COPY } from '@/lib/copy';

const KEY = 'daeng:auth-state';

export function AuthToastWatcher() {
  const { status } = useSession();
  const toast = useToast();

  useEffect(() => {
    if (status === 'loading') return;
    const current = status === 'authenticated' ? 'in' : 'out';
    let previous: string | null = null;
    try {
      previous = sessionStorage.getItem(KEY);
      sessionStorage.setItem(KEY, current);
    } catch {
      return; /* 저장 불가 환경이면 토스트 생략 */
    }
    if (previous && previous !== current) {
      toast(current === 'in' ? COPY.toast.loggedIn : COPY.toast.loggedOut, 'success');
    }
  }, [status, toast]);

  return null;
}
