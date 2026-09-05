// 추천 도메인 공유 타입 (PRD §6, §12)

export type ReasonChip = {
  distanceKm: number;
  etaMin: number;
  quietnessNow: number;
  quietnessForecast: number; // 내일 같은 시간
  quietnessWeekAvg: number; // 이번 주 평균
  verifiedCount: number;
};

export type Recommendation = {
  poiId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  // Edge Function 실제 반환값. 두루누비 미연동이라 코스 라벨은 아직 없다.
  sourceLabel: '펫 동반 가능' | '한적한 산책지';
  type: 'CAFE' | 'RESTAURANT' | 'TRAIL' | 'PARK' | 'ATTRACTION';
  imageUrl: string | null;
  badges: Array<'PET_VERIFIED' | 'WELLNESS' | 'ECO' | 'TRAIL_OFFICIAL'>;
  petAllowed: boolean;
  /** TourAPI detailIntro2 운영시간 원문 ("상시 개방" / "08:00~17:00"). 없으면 null */
  openHoursText: string | null;
  reason: ReasonChip;
  sampleSufficient: boolean;
};

export type Pet = {
  id: string;
  name: string;
  breed: string;
  weightKg: number;
  ageYears: number;
};

export type RecommendInput = {
  petId: string | null;
  timeHours: number;
  startAt: string;
  departure: {
    lat: number;
    lng: number;
    label?: string;
  };
};

// /recommendations 이력 resultsJson 디시리얼라이즈용 — 모든 필드 옵셔널 (구버전 호환)
export type HistoryResultPoi = {
  poiId: string;
  name: string;
  address?: string;
  type?: string;
  badges?: string[];
  reason?: {
    distanceKm?: number;
    etaMin?: number;
    quietnessNow?: number;
    verifiedCount?: number;
  };
};
