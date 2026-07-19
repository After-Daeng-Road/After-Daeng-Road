import { auth, signIn } from '@/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { SiNaver } from 'react-icons/si';
import { BrandMark } from '@/components/brand-mark';
import { COPY } from '@/lib/copy';

// PRD §7.1: ① 카카오/네이버 로그인 → ② 펫 프로필 등록

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const params = await searchParams;
  if (session?.user) redirect(params.callbackUrl ?? '/');

  const callbackUrl = params.callbackUrl ?? '/';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-3 flex items-center gap-2 text-2xl font-bold text-brand">
        <BrandMark className="h-8 w-8" /> {COPY.brand.name}
      </Link>
      <p className="mb-8 text-sm text-muted">{COPY.login.tagline}</p>

      <div className="w-full max-w-xs space-y-2.5">
        <form
          action={async () => {
            'use server';
            await signIn('kakao', { redirectTo: callbackUrl });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-field bg-kakao px-4 py-3 text-sm font-medium text-[#191919] transition-opacity hover:opacity-90"
          >
            <RiKakaoTalkFill className="h-5 w-5" aria-hidden /> {COPY.login.kakao}
          </button>
        </form>

        <form
          action={async () => {
            'use server';
            await signIn('naver', { redirectTo: callbackUrl });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-field bg-naver px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <SiNaver className="h-3.5 w-3.5" aria-hidden /> {COPY.login.naver}
          </button>
        </form>
      </div>

      {params.error && (
        <p className="mt-4 text-xs text-danger">
          {COPY.login.errorPrefix}
          {params.error}
        </p>
      )}

      <p className="mt-8 max-w-xs text-center text-[11px] leading-relaxed text-faint">
        {COPY.login.consentPre}
        <Link href="/legal/terms" className="underline">
          {COPY.common.terms}
        </Link>
        {COPY.login.consentMid}
        <Link href="/legal/privacy" className="underline">
          {COPY.common.privacy}
        </Link>
        {COPY.login.consentPost}
      </p>
    </main>
  );
}
