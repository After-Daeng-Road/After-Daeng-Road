// 댕로드 TourAPI 순수 변환 헬퍼 (Node/tsx). 네트워크·Prisma 의존 없음 → 단위테스트 대상.
// 근거: 2026-08-29 실데이터 프로브 (KorService2/areaBasedList2 + detailPetTour2)

export type PoiTypeStr =
  | 'CAFE'
  | 'RESTAURANT'
  | 'TRAIL'
  | 'PARK'
  | 'ATTRACTION'
  | 'ACCOMMODATION'
  | 'REST_AREA';

export const LDONG_REGN_CD = 44; // 충청남도 법정동 시도코드

// 조회는 법정동 시군구(3자리), 저장은 구 sigunguCode(33xxx — quietness 시드와 정합)
export const CHUNGNAM_CITIES = [
  { name: '공주', signgu: [150], sigunguCode: 33020, center: { lat: 36.4555, lng: 127.119 } },
  { name: '천안', signgu: [131, 133], sigunguCode: 33040, center: { lat: 36.8151, lng: 127.1138 } },
  { name: '아산', signgu: [200], sigunguCode: 33050, center: { lat: 36.7898, lng: 127.0017 } },
  { name: '서산', signgu: [210], sigunguCode: 33150, center: { lat: 36.7848, lng: 126.4503 } },
] as const;

// contentTypeId(12관광지·14문화·15축제·25여행코스·28레포츠·32숙박·38쇼핑·39음식점)
const CONTENT_TYPE_MAP: Record<number, PoiTypeStr> = {
  12: 'ATTRACTION',
  14: 'ATTRACTION',
  15: 'ATTRACTION',
  25: 'TRAIL',
  28: 'ATTRACTION',
  32: 'ACCOMMODATION',
  38: 'ATTRACTION',
  39: 'RESTAURANT',
};

export function contentTypeToPoiType(id: number | string): PoiTypeStr {
  return CONTENT_TYPE_MAP[Number(id)] ?? 'ATTRACTION';
}

export type PetDetail = {
  acmpyTypeCd?: string; // 동반 구역 (전구역/실내/실외)
  acmpyPsblCpam?: string; // 동반 가능 반려동물/견종
  acmpyNeedMtr?: string; // 필요 준비물
  etcAcmpyInfo?: string; // 기타 동반 정보
  relaAcdntRiskMtr?: string; // 관련 위험/견종
};

export type PetFields = {
  petAllowed: boolean;
  petIndoor: boolean | null;
  petOutdoor: boolean | null;
  petPolicyText: string | null;
  petSizeMaxKg: number | null;
};

export function parsePetFields(pet: PetDetail | null | undefined): PetFields {
  const hasData =
    !!pet &&
    !!(
      pet.acmpyTypeCd ||
      pet.acmpyPsblCpam ||
      pet.acmpyNeedMtr ||
      pet.etcAcmpyInfo ||
      pet.relaAcdntRiskMtr
    );
  if (!hasData) {
    return {
      petAllowed: false,
      petIndoor: null,
      petOutdoor: null,
      petPolicyText: null,
      petSizeMaxKg: null,
    };
  }
  const zone = String(pet!.acmpyTypeCd ?? '');
  const petIndoor = zone ? zone.includes('실내') || zone.includes('전구역') : null;
  const petOutdoor = zone ? zone.includes('실외') || zone.includes('전구역') : null;
  const parts = [pet!.acmpyPsblCpam, pet!.acmpyNeedMtr, pet!.etcAcmpyInfo]
    .map((s) => (s ?? '').trim())
    .filter(Boolean);
  const petPolicyText = parts.length ? parts.join(' / ') : null;
  const kg = String(pet!.acmpyPsblCpam ?? '').match(/(\d+)\s*kg/i);
  const petSizeMaxKg = kg ? Number(kg[1]) : null;
  return { petAllowed: true, petIndoor, petOutdoor, petPolicyText, petSizeMaxKg };
}

export type TourItem = {
  contentid: string | number;
  contenttypeid: string | number;
  title: string;
  addr1?: string;
  mapx?: string | number; // 경도 lng
  mapy?: string | number; // 위도 lat
  firstimage?: string;
  tel?: string;
};

export type PoiInput = {
  source: 'TOUR_API_KOR';
  sourceId: string;
  contentTypeId: number;
  name: string;
  type: PoiTypeStr;
  sigunguCode: number;
  address: string | null;
  lat: number;
  lng: number;
  geohash7: string;
  imageUrls: string[];
  phone: string | null;
  lastSyncedAt: Date;
} & PetFields;

export function buildPoiInput(
  item: TourItem,
  pet: PetDetail | null,
  sigunguCode: number,
  now: Date,
): PoiInput {
  const lat = Number(item.mapy);
  const lng = Number(item.mapx);
  return {
    source: 'TOUR_API_KOR',
    sourceId: String(item.contentid),
    contentTypeId: Number(item.contenttypeid),
    name: item.title,
    type: contentTypeToPoiType(item.contenttypeid),
    sigunguCode,
    address: item.addr1?.trim() || null,
    lat,
    lng,
    geohash7: geohash7(lat, lng),
    imageUrls: item.firstimage ? [item.firstimage] : [],
    phone: item.tel?.trim() || null,
    lastSyncedAt: now,
    ...parsePetFields(pet),
  };
}

export function geohash7(lat: number, lng: number): string {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latR = [-90, 90];
  let lngR = [-180, 180];
  let bits = 0;
  let bit = 0;
  let evenBit = true;
  let hash = '';
  while (hash.length < 7) {
    if (evenBit) {
      const mid = (lngR[0] + lngR[1]) / 2;
      if (lng >= mid) {
        bits = (bits << 1) | 1;
        lngR = [mid, lngR[1]];
      } else {
        bits = bits << 1;
        lngR = [lngR[0], mid];
      }
    } else {
      const mid = (latR[0] + latR[1]) / 2;
      if (lat >= mid) {
        bits = (bits << 1) | 1;
        latR = [mid, latR[1]];
      } else {
        bits = bits << 1;
        latR = [latR[0], mid];
      }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      hash += BASE32[bits];
      bits = 0;
      bit = 0;
    }
  }
  return hash;
}

// ─── detailCommon2 / detailImage2 응답 정제 ───
// 근거: 2026-09-05 KorPetTourService2 실응답. homepage 는 앵커태그·순수URL·스킴없는주소
// 세 형태로 오고, overview 에는 <br> 과 HTML 엔티티가 섞인다.

const HTML_ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/** detailCommon2 의 homepage → 링크로 쓸 수 있는 URL (없으면 null) */
export function parseHomepage(raw: string | undefined | null): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;

  // <a href="...">텍스트</a> 형태면 href 를 쓴다 (표시 텍스트는 한글 도메인이라 링크로 부적합)
  const href = s.match(/<a[^>]*\shref=["']([^"']*)["']/i)?.[1]?.trim();
  const url = href !== undefined ? href : s.replace(/<[^>]*>/g, '').trim();
  if (!url) return null;

  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** detailCommon2 의 overview → 평문 소개글 (없으면 null) */
export function cleanOverview(raw: string | undefined | null): string | null {
  let s = (raw ?? '').replace(/<[^>]*>/g, ' ');
  for (const [ent, ch] of Object.entries(HTML_ENTITIES)) s = s.split(ent).join(ch);
  s = s.split('&amp;').join('&'); // &amp; 는 마지막 (이중 이스케이프 방지)
  s = s.replace(/\s+/g, ' ').trim();
  return s || null;
}

/** 대표이미지(firstimage) + 상세이미지(detailImage2) 병합. http→https 정규화 후 중복 제거 */
export function mergeImageUrls(existing: string[], extra: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...existing, ...extra]) {
    const url = (raw ?? '').trim().replace(/^http:\/\//i, 'https://');
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

// ─── detailIntro2 운영시간 ───
// 실응답은 세 형태다: "상시 개방" / "08:00~17:00" / "기상여건에 따라 통제 되므로 …"(안내문).
// 안내문은 파싱하지 않고 null 로 둔다 — 추천에서 시간 판단 자체를 건너뛰게 해서
// 정보가 없다는 이유로 후보에서 탈락시키지 않는다.

const ALWAYS_OPEN_RE = /상시|24\s*시간|연중\s*무휴\s*개방/;
const HOUR_RANGE_RE = /(\d{1,2}):(\d{2})\s*[~\-–—]\s*(\d{1,2}):(\d{2})/;

export type OpenHours = { openFrom: number | null; openTo: number | null };

export function parseUseTime(raw: string | undefined | null): OpenHours {
  const s = (raw ?? '').trim();
  if (!s) return { openFrom: null, openTo: null };
  if (ALWAYS_OPEN_RE.test(s)) return { openFrom: 0, openTo: 24 };

  // 여러 범위(하절기/동절기)가 있으면 첫 번째를 대표값으로 쓴다
  const m = s.match(HOUR_RANGE_RE);
  if (!m) return { openFrom: null, openTo: null };

  const from = Number(m[1]);
  const to = Number(m[3]);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > 24 || to > 24) {
    return { openFrom: null, openTo: null };
  }
  return { openFrom: from, openTo: to };
}

/** 해당 시각에 열려 있는가. 정보가 없으면 true (모르는 것을 닫힘으로 취급하지 않는다) */
export function isOpenAtHour(
  openFrom: number | null | undefined,
  openTo: number | null | undefined,
  hour: number,
): boolean {
  if (openFrom == null || openTo == null) return true;
  if (openFrom === openTo) return true; // 24시간 운영 표기
  if (openFrom < openTo) return hour >= openFrom && hour < openTo;
  return hour >= openFrom || hour < openTo; // 자정 넘김 (예: 22~02)
}

// detailIntro2 는 contentTypeId 마다 필드명이 다르다 (실응답 확인):
//   12 관광지 usetime / 14 문화시설 usetimeculture / 28 레포츠 usetimeleports
//   38 쇼핑 opentime / 39 음식점 opentimefood
// 타입 → 키 매핑표를 두는 대신, 후보 키를 순서대로 훑어 첫 값을 쓴다.
// 응답에는 해당 타입의 키만 오므로 충돌하지 않고, 새 타입이 늘어도 목록만 추가하면 된다.
const INTRO_KEYS = {
  useTimeText: ['usetime', 'usetimeleports', 'usetimeculture', 'opentime', 'opentimefood'],
  restDateText: [
    'restdate',
    'restdateleports',
    'restdateculture',
    'restdateshopping',
    'restdatefood',
  ],
  parkingText: ['parking', 'parkingleports', 'parkingculture', 'parkingshopping', 'parkingfood'],
  infoCenter: [
    'infocenter',
    'infocenterleports',
    'infocenterculture',
    'infocentershopping',
    'infocenterfood',
  ],
} as const;

export type IntroFields = {
  useTimeText: string | null;
  restDateText: string | null;
  parkingText: string | null;
  infoCenter: string | null;
};

export function pickIntroFields(intro: Record<string, string> | null | undefined): IntroFields {
  const pick = (keys: readonly string[]): string | null => {
    for (const k of keys) {
      const v = intro?.[k]?.trim();
      if (v) return v;
    }
    return null;
  };
  return {
    useTimeText: pick(INTRO_KEYS.useTimeText),
    restDateText: pick(INTRO_KEYS.restDateText),
    parkingText: pick(INTRO_KEYS.parkingText),
    infoCenter: pick(INTRO_KEYS.infoCenter),
  };
}
