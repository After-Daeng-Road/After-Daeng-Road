'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPet } from '@/lib/actions/pets';
import { COPY } from '@/lib/copy';
import { PET_RESTRICTIONS, type RestrictionKey } from '@/lib/constants';

export function NewPetForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [weightKg, setWeightKg] = useState(5);
  const [ageYears, setAgeYears] = useState(3);
  const [restrictions, setRestrictions] = useState<RestrictionKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (v: RestrictionKey) => {
    setRestrictions((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createPet({ name, breed, weightKg, ageYears, restrictions });
      if (res.ok) router.push('/me');
      // 게이트 우회 등으로 세션이 없을 때 raw 'Unauthorized' 대신 친절한 안내
      else setError(res.error === 'Unauthorized' ? COPY.pets.loginError : res.error);
    });
  };

  const inputCls =
    'mt-1 w-full rounded-field border border-line bg-surface-2 px-3 py-2 text-sm text-body';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="name">
          {COPY.pets.name}
        </label>
        <input
          id="name"
          type="text"
          required
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder={COPY.pets.namePlaceholder}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink" htmlFor="breed">
          {COPY.pets.breed}
        </label>
        <input
          id="breed"
          type="text"
          required
          maxLength={40}
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          className={inputCls}
          placeholder={COPY.pets.breedPlaceholder}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="weight">
            {COPY.pets.weight}
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
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="age">
            {COPY.pets.age}
          </label>
          <input
            id="age"
            type="number"
            min={0}
            max={30}
            required
            value={ageYears}
            onChange={(e) => setAgeYears(Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink">{COPY.pets.restrictions}</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PET_RESTRICTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => toggle(r.value)}
              className={`rounded-field py-2 text-xs font-medium ${
                restrictions.includes(r.value)
                  ? 'bg-brand text-white dark:text-[#20160f]'
                  : 'border border-line bg-surface text-muted'
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
        className="w-full rounded-field bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50 dark:text-[#20160f]"
      >
        {isPending ? COPY.pets.submitting : COPY.pets.submit}
      </button>

      {error && <p className="text-center text-xs text-danger">{error}</p>}
    </form>
  );
}
