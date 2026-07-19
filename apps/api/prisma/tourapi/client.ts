// 댕로드 TourAPI 호출부 (Node). serviceKey=Decoding 키, URLSearchParams 자동 인코딩.
// 근거 프로브: areaBasedList2(lDongRegnCd/lDongSignguCd) + detailPetTour2(contentId)
import { LDONG_REGN_CD, type TourItem, type PetDetail } from './transform.ts';

const BASE = 'https://apis.data.go.kr/B551011';
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

async function getJson(u: string): Promise<any> {
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 비JSON 에러 */
  }
  const code = json?.response?.header?.resultCode;
  if (code !== '0000') {
    throw new Error(`TourAPI 실패 HTTP ${res.status} code=${code ?? '?'} ${text.slice(0, 120)}`);
  }
  return json;
}

function asArray<T>(item: T | T[] | undefined | ''): T[] {
  if (!item || item === '') return [];
  return Array.isArray(item) ? item : [item];
}

/** 한 시군구(법정동 3자리)의 전체 POI (페이지네이션) */
export async function fetchAreaBasedList(signgu: number): Promise<TourItem[]> {
  const out: TourItem[] = [];
  const numOfRows = 100;
  for (let pageNo = 1; pageNo <= 20; pageNo++) {
    const json = await getJson(
      url('KorService2/areaBasedList2', {
        numOfRows,
        pageNo,
        arrange: 'C',
        lDongRegnCd: LDONG_REGN_CD,
        lDongSignguCd: signgu,
      }),
    );
    const body = json.response.body;
    const items = asArray<TourItem>(body?.items?.item);
    out.push(...items);
    if (out.length >= Number(body?.totalCount ?? 0) || items.length < numOfRows) break;
  }
  return out;
}

/** contentId 의 펫 동반 상세 (없으면 null) */
export async function fetchDetailPetTour(contentId: string | number): Promise<PetDetail | null> {
  try {
    const json = await getJson(url('KorService2/detailPetTour2', { contentId }));
    const item = json.response.body?.items?.item;
    const first = Array.isArray(item) ? item[0] : item;
    return first && typeof first === 'object' ? (first as PetDetail) : null;
  } catch {
    return null; // 펫 미등록/조회실패는 미동반으로 처리
  }
}
