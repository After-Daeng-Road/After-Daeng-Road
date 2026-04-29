import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { listPets } from '@/lib/actions/pets';
import { ChevronRight, Dog, History, LogOut, Mail, Plus } from 'lucide-react';

// PRD §7.2 [마이펫타임] — 펫 프로필 / 다녀온 곳 / 후기 / 알림 설정

export default async function MePage() {
  const session = await auth();
  if (!session?.user) return null; // middleware가 /login 리다이렉트
  const pets = await listPets();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">마이펫타임</h1>
          <p className="mt-1 text-sm text-gray-500">{session.user.email}</p>
        </div>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden /> 로그아웃
          </button>
        </form>
      </header>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
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
          <p className="text-sm text-gray-500">아직 등록된 반려견이 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {pets.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200">
                  <Dog className="h-5 w-5 text-gray-500" aria-hidden />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {p.breed} · {String(p.weightKg)}kg · {p.ageYears}살
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="space-y-2">
        <NavItem
          href="/me/settings"
          icon={<Mail className="h-4 w-4 text-brand" aria-hidden />}
          title="이메일 알림 설정"
        />
        <NavItem
          href="/recommendations"
          icon={<History className="h-4 w-4 text-brand" aria-hidden />}
          title="최근 추천 이력"
        />
      </nav>
    </main>
  );
}

function NavItem({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm hover:border-brand"
    >
      <span className="flex items-center gap-2">
        {icon}
        {title}
      </span>
      <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
    </Link>
  );
}
