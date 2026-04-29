'use client';

import { useState, useTransition } from 'react';
import { updateNotifySettings, type NotifySettings } from '@/lib/actions/notify-settings';

const DAY_LABELS: Record<NotifySettings['days'][number], string> = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
  SUN: '일',
};

type DayKey = NotifySettings['days'][number];

const ALL_DAYS: DayKey[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function NotifySettingsForm({ initial }: { initial: NotifySettings }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [time, setTime] = useState(initial.time);
  const [days, setDays] = useState<DayKey[]>(initial.days as DayKey[]);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleDay = (d: DayKey) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await updateNotifySettings({ enabled, time, days });
      if (res.ok) {
        setMessage({ type: 'ok', text: '저장되었어요' });
      } else {
        setMessage({ type: 'err', text: res.error });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <span className="text-sm font-medium">이메일 알림 받기</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-brand"
        />
      </label>

      <div className={enabled ? '' : 'pointer-events-none opacity-50'}>
        <label className="block text-sm font-medium">발송 시각</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        />

        <label className="mt-4 block text-sm font-medium">발송 요일</label>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {ALL_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`rounded-md py-2 text-xs font-medium ${
                days.includes(d)
                  ? 'bg-brand text-white'
                  : 'border border-gray-200 bg-white text-gray-600'
              }`}
            >
              {DAY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:bg-gray-300"
      >
        {isPending ? '저장 중…' : '저장'}
      </button>

      {message && (
        <p
          className={`text-center text-xs ${
            message.type === 'ok' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
