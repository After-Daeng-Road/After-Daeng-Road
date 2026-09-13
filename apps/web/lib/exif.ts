// 방문 인증 사진의 EXIF — 촬영 좌표·시각을 브라우저에서 읽는다 (PRD §6.3 EXIF 검증).
// 서버(checkIn)는 이미 파싱된 값을 받아 "POI 1km 이내 + 7일 이내" 를 판정한다.
// 파일 원본 바이트를 읽으므로 업로드 전에 호출해야 한다 — 스토리지 URL 로는 EXIF 를 알 수 없다.
// exifr 는 무겁지 않지만(약 100KB) 인증 폼에서만 쓰므로 동적 import 로 초기 번들에서 뺀다.

export type PhotoExif = {
  lat: number | null;
  lng: number | null;
  /** ISO 문자열. 카메라 시각은 시간대 정보가 없어 기기 로컬 시각으로 해석한다 */
  takenAt: string | null;
};

export const EMPTY_EXIF: PhotoExif = { lat: null, lng: null, takenAt: null };

export async function readPhotoExif(file: File): Promise<PhotoExif> {
  try {
    const exifr = (await import('exifr')).default;
    const data = (await exifr.parse(file, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude'],
    })) as
      | { latitude?: number; longitude?: number; DateTimeOriginal?: Date; CreateDate?: Date }
      | undefined;
    if (!data) return EMPTY_EXIF;

    const lat = Number.isFinite(data.latitude) ? (data.latitude as number) : null;
    const lng = Number.isFinite(data.longitude) ? (data.longitude as number) : null;
    const d = data.DateTimeOriginal ?? data.CreateDate;
    const takenAt = d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
    return { lat, lng, takenAt };
  } catch {
    // PNG·WEBP 나 EXIF 가 벗겨진 파일. 인증은 등록되지만 검증으로 집계되지 않는다
    return EMPTY_EXIF;
  }
}
