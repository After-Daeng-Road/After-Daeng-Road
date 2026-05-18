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
  sourceLabel: '두루누비 코스' | '펫동반 가능' | 'TourAPI';
  type: 'CAFE' | 'RESTAURANT' | 'TRAIL' | 'PARK' | 'ATTRACTION';
  imageUrl: string | null;
  badges: Array<'PET_VERIFIED' | 'WELLNESS' | 'ECO' | 'TRAIL_OFFICIAL'>;
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
