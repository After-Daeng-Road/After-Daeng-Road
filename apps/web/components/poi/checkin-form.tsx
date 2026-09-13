'use client';

// 방문 인증(체크인) 폼 — PRD §6.3. 한적/보통/복잡 평가 + 현장 사진 1장 → checkIn.
// 사진은 업로드 직전 원본 File 에서 EXIF(좌표·촬영시각)를 읽어 서버에 함께 보낸다.
// 서버가 "POI 1km 이내 + 7일 이내" 를 판정해 isValid 를 정하고, 배지 부여는 DB 트리거(0003)가 한다.
// 이 폼이 없어서 인증 0건 · PET_VERIFIED 0건 · 추천 점수의 검증 가중치 0 이었다.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { BadgeCheck, LogIn, MapPin } from 'lucide-react';
import { checkIn } from '@/lib/actions/verifications';
import { useToast } from '@/components/ui/toast';
import { COPY } from '@/lib/copy';
import { EMPTY_EXIF, readPhotoExif, type PhotoExif } from '@/lib/exif';
import { formatDate } from '@/lib/format';

// 후기 폼과 같은 이유로 지연 로드 — supabase-js 를 상세 초기 번들에서 뺀다
const PhotoUpload = dynamic(() => import('@/components/photo-upload').then((m) => m.PhotoUpload), {
  ssr: false,
});

const K = COPY.poi.checkin;
type Evaluation = (typeof K.evaluations)[number]['value'];

export function CheckInForm({ poiId }: { poiId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [exif, setExif] = useState<PhotoExif>(EMPTY_EXIF);
  const [exifReading, setExifReading] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (status !== 'authenticated') {
    return (
      <section className="mt-5 rounded-card border border-line bg-surface p-4">
        <h2 className="mb-1 text-sm font-semibold text-ink">{K.title}</h2>
        <p className="mb-3 text-xs text-muted">{K.desc}</p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/poi/${poiId}`)}`}
          className="inline-flex items-center gap-1.5 rounded-field bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover dark:text-[#20160f]"
        >
          <LogIn className="h-4 w-4" aria-hidden /> {K.loginCta}
        </Link>
      </section>
    );
  }

  // 업로드 직전 원본 파일에서 EXIF 를 읽는다 — URL 이 된 뒤에는 읽을 수 없다
  const handleFileSelected = (file: File) => {
    setExifReading(true);
    readPhotoExif(file)
      .then(setExif)
      .finally(() => setExifReading(false));
  };

  const handlePhotosChange = (urls: string[]) => {
    setPhotos(urls);
    if (urls.length === 0) setExif(EMPTY_EXIF);
  };

  const exifNote = (() => {
    if (photos.length === 0 && !exifReading) return null;
    if (exifReading) return K.exifReading;
    if (exif.lat == null || exif.lng == null) return K.exifNoGps;
    return exif.takenAt ? K.exifOk(formatDate(new Date(exif.takenAt))) : K.exifNoDate;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluation) {
      toast(K.evaluationRequired, 'error');
      return;
    }
    startTransition(async () => {
      const res = await checkIn({
        poiId,
        evaluation,
        photoUrl: photos[0] ?? null,
        exif: photos[0] ? exif : null,
      });
      if (!res.ok) {
        toast(res.error === 'Unauthorized' ? K.loginError : res.error, 'error');
        return;
      }
      toast(res.verification.isValid ? K.doneValid : K.doneInvalid, 'success');
      setEvaluation(null);
      setPhotos([]);
      setExif(EMPTY_EXIF);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 rounded-card border border-line bg-surface p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <BadgeCheck className="h-4 w-4 text-verify" aria-hidden /> {K.title}
      </h2>
      <p className="mt-1 text-xs text-muted">{K.desc}</p>

      <div className="mt-3">
        <span className="mb-1.5 block text-xs font-medium text-muted">{K.evaluationLabel}</span>
        <div role="radiogroup" aria-label={K.evaluationLabel} className="grid grid-cols-3 gap-2">
          {K.evaluations.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={evaluation === opt.value}
              onClick={() => setEvaluation(opt.value)}
              className={`rounded-field py-2 text-xs font-medium transition-colors ${
                evaluation === opt.value
                  ? 'bg-brand text-white dark:text-[#20160f]'
                  : 'border border-line bg-surface-2 text-muted hover:border-faint'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-muted">{K.photoLabel}</label>
        <PhotoUpload
          purpose="verifications"
          poiId={poiId}
          value={photos}
          onChange={handlePhotosChange}
          onFileSelected={handleFileSelected}
          max={1}
        />
        <p className="mt-1.5 text-[11px] text-faint">{K.photoHint}</p>
        {exifNote && (
          <p
            className={`mt-1 flex items-center gap-1 text-[11px] ${
              exif.lat != null && !exifReading ? 'text-quiet' : 'text-muted'
            }`}
          >
            <MapPin className="h-3 w-3" aria-hidden /> {exifNote}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || exifReading}
        className="mt-4 w-full rounded-field bg-brand py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50 dark:text-[#20160f]"
      >
        {isPending ? K.submitting : K.submit}
      </button>
    </form>
  );
}
