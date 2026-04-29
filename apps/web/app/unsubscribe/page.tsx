import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token';

// PRD §16.4 — 1탭 수신거부 (HMAC 토큰 검증 → 즉시 OFF)

type SearchParams = Promise<{ token?: string }>;

export const metadata = { title: '이메일 수신 거부' };

export default async function UnsubscribePage({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <Result
        title="잘못된 링크입니다"
        message="이메일에 포함된 정상 링크로 다시 시도해주세요."
        ok={false}
      />
    );
  }

  const v = verifyUnsubscribeToken(token);
  if (!v.ok) {
    return (
      <Result
        title="수신 거부 처리 실패"
        message={`사유: ${v.error}. 마이페이지 → 이메일 알림 설정에서 직접 OFF 가능합니다.`}
        ok={false}
      />
    );
  }

  await prisma.user.update({
    where: { id: v.userId },
    data: { emailNotifyEnabled: false },
  });

  return (
    <Result
      title="수신 거부 완료"
      message="더 이상 댕로드 추천 이메일을 받지 않으세요. 다시 받고 싶으시면 마이페이지에서 설정할 수 있어요."
      ok={true}
    />
  );
}

function Result({ title, message, ok }: { title: string; message: string; ok: boolean }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-5xl">{ok ? '✅' : '⚠️'}</div>
      <h1 className="mt-3 text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover"
      >
        홈으로
      </Link>
    </main>
  );
}
