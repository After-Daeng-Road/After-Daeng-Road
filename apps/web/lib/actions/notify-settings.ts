'use server';

// PRD §12.1 notifySettings.update — 이메일 알림 시간/요일/ON·OFF 설정 (PRD §16.4 P0)

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const SettingsSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  days: z
    .array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']))
    .min(1)
    .max(7),
});

export type NotifySettings = z.infer<typeof SettingsSchema>;

export async function updateNotifySettings(input: NotifySettings) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: 'Unauthorized' };

  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      emailNotifyEnabled: parsed.data.enabled,
      emailNotifyTime: parsed.data.time,
      emailNotifyDays: parsed.data.days,
    },
  });

  revalidatePath('/me/settings');
  return { ok: true as const };
}
