import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { DeleteAccountForm } from './delete-account-form';
import { COPY } from '@/lib/copy';

// 회원 탈퇴 전용 페이지 — 알림 설정과 분리 (마이펫타임 하단 '회원탈퇴' 링크 진입점)

export const metadata = { title: COPY.account.dangerTitle };

export default async function WithdrawPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/me/delete-account');

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <DeleteAccountForm />
    </main>
  );
}
