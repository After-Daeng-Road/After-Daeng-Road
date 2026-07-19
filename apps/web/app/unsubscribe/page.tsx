import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { COPY } from '@/lib/copy';

// PRD §16.4 — 1탭 수신거부 (HMAC 토큰 검증 → 즉시 OFF)

type SearchParams = Promise<{ token?: string }>;

export const metadata = { title: COPY.unsubscribe.metaTitle };

export default async function UnsubscribePage({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <Result
        title={COPY.unsubscribe.badLinkTitle}
        message={COPY.unsubscribe.badLinkMsg}
        ok={false}
      />
    );
  }

  const v = verifyUnsubscribeToken(token);
  if (!v.ok) {
    return (
      <Result
        title={COPY.unsubscribe.failTitle}
        message={COPY.unsubscribe.failMsg(v.error)}
        ok={false}
      />
    );
  }

  await prisma.user.update({
    where: { id: v.userId },
    data: { emailNotifyEnabled: false },
  });

  return <Result title={COPY.unsubscribe.doneTitle} message={COPY.unsubscribe.doneMsg} ok={true} />;
}

function Result({ title, message, ok }: { title: string; message: string; ok: boolean }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      {ok ? (
        <CheckCircle2 className="mx-auto h-14 w-14 text-quiet" aria-hidden />
      ) : (
        <AlertTriangle className="mx-auto h-14 w-14 text-danger" aria-hidden />
      )}
      <h1 className="mt-3 text-xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-field bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover dark:text-[#20160f]"
      >
        {COPY.common.home}
      </Link>
    </main>
  );
}
