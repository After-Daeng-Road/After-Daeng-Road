'use client';

import { useState, useTransition } from 'react';
import { updateNotifySettings, type NotifySettings } from '@/lib/actions/notify-settings';
import { COPY } from '@/lib/copy';
import { DAY_LABELS, DAY_ORDER, type DayKey } from '@/lib/constants';

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
        setMessage({ type: 'ok', text: COPY.settings.saved });
      } else {
        setMessage({ type: 'err', text: res.error });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
        <span className="text-sm font-medium text-ink">{COPY.settings.enable}</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-brand"
        />
      </label>

      <div className={enabled ? '' : 'pointer-events-none opacity-50'}>
        <label className="block text-sm font-medium text-ink">{COPY.settings.time}</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="mt-1 w-full rounded-field border border-line bg-surface-2 px-3 py-2 text-sm text-body"
        />

        <label className="mt-4 block text-sm font-medium text-ink">{COPY.settings.days}</label>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {DAY_ORDER.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`rounded-field py-2 text-xs font-medium ${
                days.includes(d)
                  ? 'bg-brand text-white dark:text-[#20160f]'
                  : 'border border-line bg-surface text-muted'
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
        className="w-full rounded-field bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50 dark:text-[#20160f]"
      >
        {isPending ? COPY.common.saving : COPY.common.save}
      </button>

      {message && (
        <p
          className={`text-center text-xs ${message.type === 'ok' ? 'text-quiet' : 'text-danger'}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
