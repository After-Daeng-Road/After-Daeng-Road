import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { listPets } from '@/lib/actions/pets';

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
          <button type="submit" className="text-xs text-gray-500 underline hover:text-gray-700">
            로그아웃
          </button>
        </form>
      </header>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">내 반려견</h2>
          <Link href="/me/pets/new" className="text-xs text-brand hover:underline">
            + 추가
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
                <div className="h-9 w-9 rounded-full bg-gray-200" aria-hidden />
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
        <NavItem href="/me/settings" emoji="📧" title="이메일 알림 설정" />
        <NavItem href="/recommendations" emoji="📍" title="최근 추천 이력" />
      </nav>
    </main>
  );
}

function NavItem({ href, emoji, title }: { href: string; emoji: string; title: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm hover:border-brand"
    >
      <span className="flex items-center gap-2">
        <span aria-hidden>{emoji}</span>
        {title}
      </span>
      <span className="text-gray-400">›</span>
    </Link>
  );
}
