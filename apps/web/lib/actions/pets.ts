'use server';

// PRD §12.1 pets.createPet — 펫 프로필 등록 (PRD §6, §11.1 pets 테이블)

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
  return { ok: true as const, pet };
}

export async function listPets() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return prisma.pet.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  });
}
