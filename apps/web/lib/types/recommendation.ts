// 추천 도메인 공유 타입 (PRD §6, §12)

export type ReasonChip = {
  distanceKm: number;
  /** 편도 이동 시간(분) */
  etaMin: number;
  /** 왕복 이동 시간(분). 이 필드 이전에 저장된 이력에는 없으므로 옵셔널 */
  roundTripMin?: number;
  /** 왕복을 빼고 현지에서 쓸 수 있는 시간(분). 이전 이력에는 없으므로 옵셔널 */
  stayMin?: number;
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
  // Edge Function 실제 반환값
  sourceLabel: '펫 동반 가능' | '한적한 산책지' | '두루누비 코스';
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
  /** 더보기(페이지네이션) 시에는 첫 요청의 값을 그대로 재사용해야 순서가 흔들리지 않는다.
   *  운영시간·한적도 판정이 이 시각 기준이라 매번 현재 시각을 보내면 목록이 바뀔 수 있다. */
  startAt: string;
  departure: {
    lat: number;
    lng: number;
    label?: string;
  };
  /** 반환 개수 (1~100). 생략하면 3 */
  limit?: number;
  /** 건너뛸 개수 (0~100). 생략하면 0. offset + limit <= 100 */
  offset?: number;
};

/** POST /api/recommend 응답 */
export type RecommendResponse = {
  recommendations: Recommendation[];
  offset: number;
  limit: number;
  /** 다음 페이지가 남아 있는지 — "더보기" 버튼 노출 판단용 */
  hasMore: boolean;
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
