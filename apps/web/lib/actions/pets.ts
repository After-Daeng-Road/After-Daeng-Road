'use server';

// PRD §12.1 pets.createPet — 펫 프로필 등록 (PRD §6, §11.1 pets 테이블)

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Prisma Pet.weightKg 는 Decimal → Server Action 반환/서버→클라이언트 전달 시 직렬화 불가
// ("Decimal objects are not supported"). number 로 평문화해서 반환한다.
function toPlainPet<T extends { weightKg: unknown }>(
  pet: T,
): Omit<T, 'weightKg'> & { weightKg: number } {
  return { ...pet, weightKg: Number(pet.weightKg) };
}

const PetInputSchema = z.object({
  name: z.string().min(1).max(20),
  breed: z.string().min(1).max(40),
  weightKg: z.number().min(0.5).max(80),
  ageYears: z.number().int().min(0).max(30),
  restrictions: z.array(z.enum(['CAR_SICK', 'HEAT_SENSITIVE', 'NOISE_SENSITIVE'])).default([]),
});

export type PetInput = z.infer<typeof PetInputSchema>;

export async function createPet(input: PetInput) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: 'Unauthorized' };

  const parsed = PetInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  const pet = await prisma.pet.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  revalidatePath('/me');
  return { ok: true as const, pet: toPlainPet(pet) };
}

export async function listPets() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const pets = await prisma.pet.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  });
  return pets.map(toPlainPet);
}

// PRD §11.1, §14, §14.2 — 펫 헬스(알레르기·만성질환) 분리 명시 동의
const SENSITIVE_INPUT_SCHEMA = z.object({
  petId: z.string().uuid(),
  allergies: z.array(z.string().max(40)).max(20),
  conditions: z.array(z.string().max(40)).max(20),
  consentVer: z.string(), // 동의 시점의 약관 버전 (예: 'pet-health-v1.0.0')
});

export type SensitiveInput = z.infer<typeof SENSITIVE_INPUT_SCHEMA>;

export async function consentPetSensitive(input: SensitiveInput) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, error: 'Unauthorized' };

  const parsed = SENSITIVE_INPUT_SCHEMA.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  // 본인 소유 펫 검증 (RLS 우회 방지)
  const pet = await prisma.pet.findUnique({
    where: { id: parsed.data.petId },
    select: { userId: true },
  });
  if (!pet || pet.userId !== session.user.id) {
    return { ok: false as const, error: 'Forbidden' };
  }

  await prisma.petSensitive.upsert({
    where: { petId: parsed.data.petId },
    create: {
      petId: parsed.data.petId,
      allergies: parsed.data.allergies,
      conditions: parsed.data.conditions,
      consentedAt: new Date(),
      consentVer: parsed.data.consentVer,
    },
    update: {
      allergies: parsed.data.allergies,
      conditions: parsed.data.conditions,
      consentedAt: new Date(),
      consentVer: parsed.data.consentVer,
    },
  });

  revalidatePath('/me');
  return { ok: true as const };
}
