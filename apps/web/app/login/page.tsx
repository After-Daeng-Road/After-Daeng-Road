import { auth, signIn } from '@/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FcGoogle } from 'react-icons/fc';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { BrandMark } from '@/components/brand-mark';
import { SubmitButton } from '@/components/ui/submit-button';
import { COPY } from '@/lib/copy';

// PRD §7.1: ① 구글/카카오/네이버 로그인 → ② 펫 프로필 등록

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const params = await searchParams;
  if (session?.user) redirect(params.callbackUrl ?? '/');

  const callbackUrl = params.callbackUrl ?? '/';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      {/* 아이콘 위 / 워드마크 아래 — 둘 다 가운데 정렬 */}
      <Link
        href="/"
        className="mb-3 flex flex-col items-center gap-2 text-2xl font-bold text-black dark:text-white"
      >
        <BrandMark className="h-20 w-20" />
        {COPY.brand.name}
      </Link>
      <p className="mb-8 text-sm text-faint">{COPY.login.tagline}</p>

      <div className="w-full max-w-xs space-y-2.5">
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: callbackUrl });
          }}
        >
          <SubmitButton className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-field border border-line bg-surface px-4 py-3 text-sm font-medium text-body transition-colors hover:bg-surface-2 disabled:opacity-70 dark:border-transparent dark:bg-white dark:text-black dark:hover:bg-white/90">
            <FcGoogle className="h-5 w-5" aria-hidden /> {COPY.login.google}
          </SubmitButton>
        </form>

        <form
          action={async () => {
            'use server';
            await signIn('kakao', { redirectTo: callbackUrl });
          }}
        >
          <SubmitButton className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-field bg-kakao px-4 py-3 text-sm font-medium text-[#191919] transition-opacity hover:opacity-90 disabled:opacity-70">
            <RiKakaoTalkFill className="h-5 w-5" aria-hidden /> {COPY.login.kakao}
          </SubmitButton>
        </form>
        {/* 네이버 로그인 — UI 에서만 숨김 (프로바이더 설정은 auth.config 에 유지, 재노출 시 폼만 복원) */}
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
