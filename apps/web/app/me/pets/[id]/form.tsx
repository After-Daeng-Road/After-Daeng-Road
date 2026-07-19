'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { consentPetSensitive } from '@/lib/actions/pets';
import { COPY } from '@/lib/copy';
import { CONSENT_VERSION, SENSITIVE_MAX_ITEMS, SENSITIVE_MAX_LEN } from '@/lib/constants';

const S = COPY.petSensitive;

// 태그 입력 필드 — 텍스트 입력 + 추가 버튼, 항목은 제거 가능한 칩으로.
function TagField({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim().slice(0, SENSITIVE_MAX_LEN);
    if (!v || items.includes(v) || items.length >= SENSITIVE_MAX_ITEMS) {
      setDraft('');
      return;
    }
    onChange([...items, v]);
    setDraft('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-ink">{label}</label>
      <div className="mt-1.5 flex gap-1.5">
        <input
          type="text"
          value={draft}
          maxLength={SENSITIVE_MAX_LEN}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          className="h-10 flex-1 rounded-field border border-line bg-surface-2 px-3 text-sm text-body placeholder:text-faint focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={items.length >= SENSITIVE_MAX_ITEMS}
          className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-field border border-line bg-surface px-3 text-xs font-medium text-body transition-colors hover:border-faint disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden /> {S.add}
        </button>
      </div>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[12px] text-brand-ink"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x !== item))}
                aria-label={S.removeTag(item)}
                className="text-brand-ink/70 cursor-pointer hover:text-brand-ink"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function PetSensitiveForm({
  petId,
  initialAllergies,
  initialConditions,
}: {
  petId: string;
  initialAllergies: string[];
  initialConditions: string[];
}) {
  const router = useRouter();
  const [allergies, setAllergies] = useState<string[]>(initialAllergies);
  const [conditions, setConditions] = useState<string[]>(initialConditions);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setMessage(null);
    startTransition(async () => {
      const res = await consentPetSensitive({
        petId,
        allergies,
        conditions,
        consentVer: CONSENT_VERSION,
      });
      if (res.ok) {
        setMessage({ type: 'ok', text: S.saved });
        router.refresh();
      } else {
        setMessage({ type: 'err', text: res.error === 'Forbidden' ? S.forbidden : res.error });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-card border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">{S.title}</h2>
      <p className="mt-1 text-xs text-muted">{S.desc}</p>

      <div className="mt-4 space-y-4">
        <TagField
          label={S.allergies}
          placeholder={S.allergiesPlaceholder}
          items={allergies}
          onChange={setAllergies}
        />
        <TagField
          label={S.conditions}
          placeholder={S.conditionsPlaceholder}
          items={conditions}
          onChange={setConditions}
        />
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-2 text-xs text-body">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
        />
        <span>{S.consentLabel}</span>
      </label>

      <button
        type="submit"
        disabled={isPending || !consent}
        className="mt-4 w-full rounded-field bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50 dark:text-[#20160f]"
      >
        {isPending ? S.submitting : S.submit}
      </button>

      {!consent && <p className="mt-2 text-center text-[11px] text-faint">{S.consentHint}</p>}
      {message && (
        <p
          className={`mt-2 text-center text-xs ${message.type === 'ok' ? 'text-quiet' : 'text-danger'}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
