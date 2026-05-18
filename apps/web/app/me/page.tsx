import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { listPets } from '@/lib/actions/pets';
import {
  Bell,
  ChevronRight,
  Dog,
  FileText,
  Heart,
  History,
  LogOut,
  Plus,
  Shield,
  Star,
} from 'lucide-react';
import { LoginRequiredCard } from '@/components/ui/login-required-card';
import { NavListItem } from '@/components/ui/nav-list-item';
import { Stat } from '@/components/ui/stat';

// PRD §7.2 [마이펫타임] — 펫 프로필 / 다녀온 곳 / 후기 / 알림 설정

export default async function MePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <LoginRequiredCard
        icon={<Dog className="h-8 w-8 text-brand" aria-hidden />}
        title="로그인이 필요해요"
        description="로그인하면 펫 프로필·추천 이력·알림 설정을 볼 수 있어요."
        callbackUrl="/me"
        ctaLabel="로그인 / 회원가입"
        footer="카카오 · 네이버로 5초 안에 시작"
      />
    );
  }

  const pets = await listPets();
  const displayName = session.user.name ?? '댕로드 친구';
  const email = session.user.email ?? '';

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      {/* 프로필 카드 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-light">
            <Dog className="h-7 w-7 text-brand" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold">{displayName}</div>
            {email && <div className="truncate text-xs text-gray-500">{email}</div>}
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600 hover:bg-gray-50"
            >
              <LogOut className="h-3 w-3" aria-hidden /> 로그아웃
            </button>
          </form>
        </div>

        {/* 활동 요약 */}
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center">
          <Stat label="다녀온 곳" value={0} />
          <Stat label="작성한 후기" value={0} />
          <Stat label="받은 검증" value={0} />
        </div>
      </section>

      {/* 내 반려견 */}
      <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">내 반려견</h2>
          <Link
            href="/me/pets/new"
            className="inline-flex items-center gap-0.5 text-xs text-brand hover:underline"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> 추가
          </Link>
        </div>
        {pets.length === 0 ? (
          <Link
            href="/me/pets/new"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:bg-gray-100"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
              <Plus className="h-5 w-5 text-gray-400" aria-hidden />
            </div>
            <span className="text-sm font-medium text-gray-700">첫 반려견을 등록해보세요</span>
            <span className="text-xs text-gray-500">한 마리 등록하면 맞춤 추천이 시작돼요</span>
          </Link>
        ) : (
          <ul className="space-y-2">
            {pets.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white">
                  <Dog className="h-5 w-5 text-brand" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {p.breed} · {String(p.weightKg)}kg · {p.ageYears}살
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" aria-hidden />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 메뉴 */}
      <nav className="mt-4 space-y-2">
        <NavListItem
          href="/me/settings"
          icon={<Bell className="h-4 w-4" aria-hidden />}
          title="이메일 알림 설정"
          subtitle="시간·요일 자율 설정 · 1탭 수신거부"
        />
        <NavListItem
          href="/recommendations"
          icon={<History className="h-4 w-4" aria-hidden />}
          title="최근 추천 이력"
          subtitle="최근 받은 추천 다시 보기"
        />
        <NavListItem
          href="#"
          icon={<Star className="h-4 w-4" aria-hidden />}
          title="내가 쓴 후기"
          subtitle="작성한 후기 관리"
          disabled
        />
        <NavListItem
          href="#"
          icon={<Heart className="h-4 w-4" aria-hidden />}
          title="저장한 장소"
          subtitle="북마크한 펫 외출 코스"
          disabled
        />
      </nav>

      <div className="mt-6 flex items-center gap-4 px-1 text-xs text-gray-500">
        <Link href="/legal/terms" className="inline-flex items-center gap-1 hover:text-gray-700">
          <FileText className="h-3 w-3" aria-hidden /> 이용약관
        </Link>
        <span className="text-gray-300" aria-hidden>
          ·
        </span>
        <Link href="/legal/privacy" className="inline-flex items-center gap-1 hover:text-gray-700">
          <Shield className="h-3 w-3" aria-hidden /> 개인정보처리방침
        </Link>
      </div>
    </main>
  );
}
