'use client';

import { useState, useTransition } from 'react';
import { Flag } from 'lucide-react';
import { reportReview } from '@/lib/actions/reviews';
import { COPY } from '@/lib/copy';

// 리뷰 신고 버튼 — reportReview(server action) 호출.
// 신고 5회 누적 시 자동 숨김은 백엔드가 처리. 로그인 필요(미로그인 시 Unauthorized).
// ⚠️ reportReview 는 잘못된 id면 Prisma throw 하므로 try/catch 병행(api-docs gotcha).

type State = 'idle' | 'done' | 'error';

export function ReportReviewButton({ reviewId }: { reviewId: string }) {
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [pending, startTransition] = useTransition();

  const handleReport = () => {
    if (state === 'done' || pending) return;
    setErrorMsg('');
    startTransition(async () => {
      try {
        const res = await reportReview(reviewId);
        if (res.ok) {
          setState('done');
        } else {
          setState('error');
          setErrorMsg(res.error === 'Unauthorized' ? COPY.poi.reportAuth : COPY.poi.reportFail);
        }
      } catch {
        setState('error');
        setErrorMsg(COPY.poi.reportFail);
      }
    });
  };

  if (state === 'done') {
    return <span className="text-[11px] text-muted">{COPY.poi.reported}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {state === 'error' && errorMsg && <span className="text-[11px] text-danger">{errorMsg}</span>}
      <button
        type="button"
        onClick={handleReport}
        disabled={pending}
        className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-faint transition-colors hover:text-muted disabled:cursor-default disabled:opacity-60"
      >
        <Flag className="h-3 w-3" aria-hidden />
        {pending ? COPY.poi.reporting : COPY.poi.report}
      </button>
    </span>
  );
}
