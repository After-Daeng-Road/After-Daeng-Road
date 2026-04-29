'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPet, type PetInput } from '@/lib/actions/pets';

const RESTRICTIONS: Array<{
  value: 'CAR_SICK' | 'HEAT_SENSITIVE' | 'NOISE_SENSITIVE';
  label: string;
}> = [
  { value: 'CAR_SICK', label: '차멀미' },
  { value: 'HEAT_SENSITIVE', label: '더위 민감' },
  { value: 'NOISE_SENSITIVE', label: '소음 민감' },
];

export function NewPetForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [weightKg, setWeightKg] = useState(5);
  const [ageYears, setAgeYears] = useState(3);
  const [restrictions, setRestrictions] = useState<PetInput['restrictions']>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (v: 'CAR_SICK' | 'HEAT_SENSITIVE' | 'NOISE_SENSITIVE') => {
    setRestrictions((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createPet({ name, breed, weightKg, ageYears, restrictions });
      if (res.ok) router.push('/me');
      else setError(res.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium" htmlFor="name">
          이름
        </label>
        <input
          id="name"
          type="text"
          required
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          placeholder="다람이"
        />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="breed">
          견종
        </label>
        <input
          id="breed"
          type="text"
          required
          maxLength={40}
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          placeholder="비숑 / 푸들 / 믹스 등"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium" htmlFor="weight">
            체중 (kg)
          </label>
          <input
            id="weight"
            type="number"
            step="0.1"
            min={0.5}
            max={80}
            required
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="age">
            나이 (살)
          </label>
          <input
            id="age"
            type="number"
            min={0}
            max={30}
            required
            value={ageYears}
            onChange={(e) => setAgeYears(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">이동 제한 (해당되는 것)</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {RESTRICTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => toggle(r.value)}
              className={`rounded-md py-2 text-xs font-medium ${
                restrictions.includes(r.value)
                  ? 'bg-brand text-white'
                  : 'border border-gray-200 bg-white text-gray-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:bg-gray-300"
      >
        {isPending ? '등록 중…' : '등록'}
      </button>

      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </form>
  );
}
