'use client';

import { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ImagePlus, X } from 'lucide-react';
import { COPY } from '@/lib/copy';
import { uploadPhoto, validatePhoto, type UploadPurpose } from '@/lib/upload';

// 사진 업로드 컴포넌트 — 썸네일 그리드 + 추가 타일 + 업로드 상태 (리뷰·방문인증 공통)
// value(업로드된 public URL 배열)는 controlled. 실제 업로드는 lib/upload(A방식, 브라우저 직접).
// pet-photos 버킷 제약(jpeg·png·webp, 5MB)을 클라에서 먼저 검증.

const U = COPY.upload;

export function PhotoUpload({
  purpose,
  poiId,
  value,
  onChange,
  max = 8,
}: {
  purpose: UploadPurpose;
  poiId: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const { data: session } = useSession();
  const accessToken = session?.supabaseAccessToken;
  const userId = session?.user?.id;
  const authed = !!accessToken && !!userId;

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canAdd = value.length + uploading < max;

  const handleFiles = async (files: FileList) => {
    setError(null);
    if (!authed) {
      setError(U.loginRequired);
      return;
    }
    const remaining = max - value.length - uploading;
    const picked = Array.from(files);
    if (picked.length > remaining) setError(U.maxReached(max));
    const toUpload = picked.slice(0, Math.max(0, remaining));

    const added: string[] = [];
    for (const file of toUpload) {
      const v = validatePhoto(file);
      if (!v.ok) {
        setError(v.error);
        continue;
      }
      setUploading((n) => n + 1);
      const res = await uploadPhoto(file, { accessToken, userId, purpose, poiId });
      setUploading((n) => n - 1);
      if (res.ok) added.push(res.url);
      else setError(res.error);
    }
    if (added.length) onChange([...value, ...added]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative h-20 w-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full rounded-field object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              aria-label={U.remove}
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-page shadow-soft"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </div>
        ))}

        {/* 업로드 중 타일 (펄스) */}
        {Array.from({ length: uploading }).map((_, i) => (
          <div
            key={`u${i}`}
            className="flex h-20 w-20 animate-pulse items-center justify-center rounded-field bg-surface-2 text-[10px] text-muted"
          >
            {U.uploading}
          </div>
        ))}

        {/* 추가 타일 */}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-field border border-dashed border-line bg-surface-2 text-[11px] text-muted transition-colors hover:border-brand hover:text-brand-ink"
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
            {U.add}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = ''; // 같은 파일 재선택 허용
        }}
      />

      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
