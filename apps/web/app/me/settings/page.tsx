import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NotifySettingsForm } from './form';

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
      <h1 className="mb-1 text-xl font-bold">이메일 알림 설정</h1>
      <p className="mb-6 text-xs text-gray-500">
        설정하신 시간·요일에 한적한 펫 외출 코스 추천을 메일로 보내드려요. (주중 최대 5회)
      </p>
      <NotifySettingsForm
        initial={{
          enabled: user?.emailNotifyEnabled ?? false,
          time: user?.emailNotifyTime ?? '18:00',
          days: (user?.emailNotifyDays ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']) as Array<
            'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
          >,
        }}
      />
    </main>
  );
}
