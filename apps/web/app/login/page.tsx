import { signIn, auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Dog } from 'lucide-react';
import { RiKakaoTalkFill } from 'react-icons/ri';
import { SiNaver } from 'react-icons/si';

// PRD §7.1: ① 카카오/네이버 로그인 → ② 펫 프로필 등록

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const params = await searchParams;
  if (session?.user) redirect(params.callbackUrl ?? '/');

  const callbackUrl = params.callbackUrl ?? '/';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-3 flex items-center gap-1.5 text-2xl font-bold text-brand">
        <Dog className="h-7 w-7" aria-hidden /> 댕로드
      </Link>
      <p className="mb-8 text-sm text-gray-500">퇴근 후 한적한 펫 외출</p>

      <div className="w-full max-w-xs space-y-2.5">
        <form
          action={async () => {
            'use server';
            await signIn('kakao', { redirectTo: callbackUrl });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] px-4 py-3 text-sm font-medium text-[#191919] hover:opacity-90"
          >
            <RiKakaoTalkFill className="h-5 w-5" aria-hidden /> 카카오로 시작하기
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
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#03C75A] px-4 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            <SiNaver className="h-3.5 w-3.5" aria-hidden /> 네이버로 시작하기
          </button>
        </form>
      </div>

      {params.error && <p className="mt-4 text-xs text-red-600">로그인 실패: {params.error}</p>}

      <p className="mt-8 max-w-xs text-center text-[11px] leading-relaxed text-gray-400">
        로그인 시{' '}
        <Link href="/legal/terms" className="underline">
          이용약관
        </Link>{' '}
        및{' '}
        <Link href="/legal/privacy" className="underline">
          개인정보처리방침
        </Link>
        에 동의하게 됩니다.
      </p>
    </main>
  );
}
