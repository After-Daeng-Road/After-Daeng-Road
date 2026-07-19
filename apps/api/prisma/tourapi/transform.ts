// 댕로드 TourAPI 순수 변환 헬퍼 (Node/tsx). 네트워크·Prisma 의존 없음 → 단위테스트 대상.
// 근거: 2026-07-19 실데이터 프로브 (KorService2/areaBasedList2 + detailPetTour2)

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
