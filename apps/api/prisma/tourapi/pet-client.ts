// 댕로드 반려동물 동반여행 서비스 호출부 (Node).
// 서비스: KorPetTourService2 (공공데이터포털 15135102) — 일반 관광정보(KorService2)와 별개 서비스.
// 이 목록에 있다는 것 자체가 "반려동물 동반 가능" 이다 (KorService2 는 건별로 되물어야 함).
//
// client.ts 와의 차이: 실패를 삼키지 않는다.
//   기존 fetchDetailPetTour 는 catch → null 반환이라 429(한도소진)가 "펫 미등록" 으로 저장됐다.
//   여기서는 호출 실패는 throw, 정상 응답의 빈 items 만 null 로 구분한다.
import { LDONG_REGN_CD, type TourItem, type PetDetail } from './transform.ts';

const BASE = 'https://apis.data.go.kr/B551011/KorPetTourService2';
const UA = 'Mozilla/5.0 (daengroad ETL)';

function requireKey(): string {
  const k = process.env.TOUR_API_SERVICE_KEY;
  if (!k) throw new Error('TOUR_API_SERVICE_KEY 미설정 (apps/api/.env)');
  return k;
}

function url(path: string, params: Record<string, string | number>): string {
  const u = new URL(`${BASE}/${path}`);
  const all = {
    MobileOS: 'ETC',
    MobileApp: 'daengroad',
    _type: 'json',
    serviceKey: requireKey(),
    ...params,
  };
  for (const [k, v] of Object.entries(all)) u.searchParams.set(k, String(v));
  return u.toString();
}

/** 호출 실패는 throw. 정상 응답(0000)만 body 를 돌려준다. */
async function getBody(u: string): Promise<any> {
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 한도초과·서비스오류는 비JSON 이거나 OpenAPI_ServiceResponse 형태 */
  }
  const code = json?.response?.header?.resultCode;
  if (code !== '0000') {
    const err = json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg ?? text.slice(0, 120);
    throw new Error(`PetTourAPI 실패 HTTP ${res.status} code=${code ?? '?'} ${err}`);
  }
  return json.response.body;
}

/** 정상 응답의 items 는 데이터가 없을 때 빈 문자열('')로 온다. */
function asArray<T>(item: T | T[] | undefined | ''): T[] {
  if (!item || item === '') return [];
  return Array.isArray(item) ? item : [item];
}

/** 한 시군구(법정동 3자리)의 펫 동반 가능 POI 전체 */
export async function fetchPetPoiList(signgu: number): Promise<TourItem[]> {
  const out: TourItem[] = [];
  const numOfRows = 100;
  for (let pageNo = 1; pageNo <= 20; pageNo++) {
    const body = await getBody(
      url('areaBasedList2', {
        numOfRows,
        pageNo,
        arrange: 'C',
        lDongRegnCd: LDONG_REGN_CD,
        lDongSignguCd: signgu,
      }),
    );
    const items = asArray<TourItem>(body?.items?.item);
    out.push(...items);
    if (out.length >= Number(body?.totalCount ?? 0) || items.length < numOfRows) break;
  }
  return out;
}

/** 펫 동반 상세. 목록에 있는 POI 라도 상세가 비어 있을 수 있어 null 을 허용한다. */
export async function fetchPetDetail(contentId: string | number): Promise<PetDetail | null> {
  const body = await getBody(url('detailPetTour2', { contentId }));
  const first = asArray<PetDetail>(body?.items?.item)[0];
  return first && typeof first === 'object' ? first : null;
}

export type PetImage = {
  originimgurl?: string;
  smallimageurl?: string;
  imgname?: string;
  serialnum?: string;
};

/** 상세 이미지 목록 (대표이미지 firstimage 와 별개, 보통 4~8장) */
export async function fetchPetImages(contentId: string | number): Promise<string[]> {
  const body = await getBody(
    url('detailImage2', { contentId, imageYN: 'Y', numOfRows: 20, pageNo: 1 }),
  );
  return asArray<PetImage>(body?.items?.item)
    .map((i) => i.originimgurl?.trim())
    .filter((u): u is string => !!u);
}

export type PetCommon = {
  overview?: string;
  homepage?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  lDongSignguCd?: string;
  tel?: string;
};

/** 공통 상세 (소개글·홈페이지·분류코드) */
export async function fetchPetCommon(contentId: string | number): Promise<PetCommon | null> {
  const body = await getBody(url('detailCommon2', { contentId }));
  const first = asArray<PetCommon>(body?.items?.item)[0];
  return first && typeof first === 'object' ? first : null;
}
