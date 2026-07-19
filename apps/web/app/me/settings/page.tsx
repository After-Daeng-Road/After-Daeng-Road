import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NotifySettingsForm } from './form';
import { COPY } from '@/lib/copy';
import { DEFAULT_NOTIFY_DAYS, DEFAULT_NOTIFY_TIME, type DayKey } from '@/lib/constants';

// PRD §16.4 — 사용자가 시간/요일/ON·OFF 자율 설정

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailNotifyEnabled: true, emailNotifyTime: true, emailNotifyDays: true },
  });

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-1 text-xl font-bold text-ink">{COPY.settings.title}</h1>
      <p className="mb-6 text-xs text-muted">{COPY.settings.desc}</p>
      <NotifySettingsForm
        initial={{
          enabled: user?.emailNotifyEnabled ?? false,
          time: user?.emailNotifyTime ?? DEFAULT_NOTIFY_TIME,
          days: (user?.emailNotifyDays ?? DEFAULT_NOTIFY_DAYS) as DayKey[],
        }}
      />
    </main>
  );
}
