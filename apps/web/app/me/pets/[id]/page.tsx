import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Dog } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { COPY } from '@/lib/copy';
import { LoginRequiredCard } from '@/components/ui/login-required-card';
import { PetSensitiveForm } from './form';

// 반려견 상세 — 프로필 + 민감 건강정보(알러지·질환) 동의 입력 (consentPetSensitive)
// 소유권 검증: 본인 펫이 아니거나 없으면 404 (존재 노출 방지, 액션의 Forbidden 과 동일 취지)

export default async function PetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <LoginRequiredCard
        icon={<Dog className="h-8 w-8 text-brand" aria-hidden />}
        title={COPY.me.loginTitle}
        description={COPY.me.loginDesc}
        callbackUrl={`/me/pets/${id}`}
        ctaLabel={COPY.me.loginCta}
      />
    );
  }

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: { sensitive: true },
  });
  if (!pet || pet.userId !== session.user.id) notFound();

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link
        href="/me"
        className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {COPY.pets.backToMe}
      </Link>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <Dog className="h-6 w-6 text-brand" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-ink">{pet.name}</h1>
          <p className="text-xs text-muted">
            {COPY.me.petMeta(pet.breed, String(pet.weightKg), pet.ageYears)}
          </p>
        </div>
      </div>

      <PetSensitiveForm
        petId={pet.id}
        initialAllergies={pet.sensitive?.allergies ?? []}
        initialConditions={pet.sensitive?.conditions ?? []}
      />
    </main>
  );
}
