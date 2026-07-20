import { Dog } from 'lucide-react';
import { auth } from '@/auth';
import { NewPetForm } from './form';
import { COPY } from '@/lib/copy';
import { LoginRequiredCard } from '@/components/ui/login-required-card';

// PRD §6.1, §11.1: 펫 프로필 등록 (이름·견종·체중·연령·이동제한)
// PRD §7.1 로그인 게이트 — 비로그인 시 로그인 안내 (미들웨어가 놓쳐도 페이지에서 방어)

export default async function NewPetPage() {
  const session = await auth();
  if (!session?.user) {
    return (
      <LoginRequiredCard
        icon={<Dog className="h-8 w-8 text-brand" aria-hidden />}
        title={COPY.pets.loginTitle}
        description={COPY.pets.loginDesc}
        callbackUrl="/me/pets/new"
        ctaLabel={COPY.me.loginCta}
        footer={COPY.me.loginFooter}
      />
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-1 text-xl font-bold text-ink">{COPY.pets.title}</h1>
      <p className="mb-6 text-xs text-muted">{COPY.pets.desc}</p>
      <NewPetForm />
    </main>
  );
}
