// 댕로드 — TourAPI 일별 ETL Edge Function
// PRD §13.1: areaBasedSyncList2 (증분 동기화) + 펫 areaBasedList + detailPetTour
// pg_cron 에서 매일 02:00 KST 호출

// @ts-expect-error — Deno URL imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// @ts-expect-error — Deno global
const env = (k: string): string => Deno.env.get(k) ?? '';

const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE = env('SUPABASE_SERVICE_ROLE_KEY');
const TOUR_API_KEY = env('TOUR_API_SERVICE_KEY');

// PRD §13.3 충남 4시 sigunguCode (areaCode 33)
const CHUNGNAM_SIGUNGU = [
  { code: 33020, name: '공주' },
  { code: 33040, name: '천안' },
  { code: 33050, name: '아산' },
  { code: 33150, name: '서산' },
];

const CONTENT_TYPE_MAP: Record<number, string> = {
  12: 'ATTRACTION',
  14: 'ATTRACTION',
  28: 'ATTRACTION',
  32: 'ACCOMMODATION',
  38: 'ATTRACTION',
  39: 'RESTAURANT',
  // 카페는 별도 categoryCode로 식별 → CAFE 매핑
};

type EtlResult = { added: number; updated: number; failed: number };

// @ts-expect-error — Deno global
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const body = await req.json().catch(() => ({}));
  const areaCode = body.areaCode ?? 33;

  const startedAt = new Date().toISOString();
  const result: EtlResult = { added: 0, updated: 0, failed: 0 };

  try {
    for (const sgg of CHUNGNAM_SIGUNGU) {
      const items = await fetchAreaBasedList({ areaCode, sigunguCode: sgg.code });
      for (const item of items) {
        try {
          const existing = await admin
            .from('pois')
            .select('id')
            .eq('source', 'TOUR_API_KOR')
            .eq('source_id', String(item.contentid))
            .maybeSingle();

          // 펫 메타 (detailPetTour) 병합
          const pet = await fetchDetailPetTour(item.contentid);

          const row = {
            source: 'TOUR_API_KOR',
            source_id: String(item.contentid),
            content_type_id: Number(item.contenttypeid),
            name: item.title,
            type: CONTENT_TYPE_MAP[Number(item.contenttypeid)] ?? 'ATTRACTION',
            sigungu_code: sgg.code,
            address: item.addr1 ?? null,
            lat: Number(item.mapy),
            lng: Number(item.mapx),
            geohash7: geohash7(Number(item.mapy), Number(item.mapx)),
            image_urls: item.firstimage ? [item.firstimage] : [],
            phone: item.tel ?? null,
            pet_allowed: !!pet,
            pet_size_max_kg: pet?.acmpyTypeCd ? parsePetSize(pet.acmpyTypeCd) : null,
            pet_indoor: pet?.acmpyPsblCpam?.includes('실내') ?? null,
            pet_outdoor: pet?.acmpyPsblCpam?.includes('실외') ?? null,
            pet_policy_text: pet?.etcAcmpyInfo ?? null,
            last_synced_at: new Date().toISOString(),
          };

          if (existing.data) {
            await admin.from('pois').update(row).eq('id', existing.data.id);
            result.updated++;
          } else {
            await admin.from('pois').insert(row);
            result.added++;
          }
        } catch (e) {
          console.error('item failed', item.contentid, e);
          result.failed++;
        }
      }
    }

    // 카테고리 배지 동기화 (웰니스/생태/두루누비)
    await admin.rpc('sync_category_badges');

    // ETL 로그 기록 (PRD §11 tour_api_sync_logs)
    await admin.from('tour_api_sync_logs').insert({
      dataset: 'pois.areaBasedList2+detailPetTour',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      count_added: result.added,
      count_updated: result.updated,
      count_removed: 0,
      status: result.failed > 0 ? 'partial' : 'ok',
      error_message: result.failed > 0 ? `${result.failed} items failed` : null,
    });

    return json({ ok: true, ...result });
  } catch (err) {
    console.error('[tour-api-etl]', err);
    await admin.from('tour_api_sync_logs').insert({
      dataset: 'pois.areaBasedList2+detailPetTour',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: 'failed',
      error_message: String(err),
    });
    return json({ error: 'ETL failed' }, 500);
  }
});

// ═══════════════ TourAPI 호출 ═══════════════

async function fetchAreaBasedList(args: {
  areaCode: number;
  sigunguCode: number;
}): Promise<Array<Record<string, unknown>>> {
  const url = new URL('https://apis.data.go.kr/B551011/KorService2/areaBasedList2');
  url.searchParams.set('serviceKey', TOUR_API_KEY);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'daengroad');
  url.searchParams.set('_type', 'json');
  url.searchParams.set('areaCode', String(args.areaCode));
  url.searchParams.set('sigunguCode', String(args.sigunguCode));
  url.searchParams.set('numOfRows', '500');
  url.searchParams.set('pageNo', '1');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TourAPI ${res.status}`);
  const json = await res.json();
  return json.response?.body?.items?.item ?? [];
}

async function fetchDetailPetTour(
  contentId: string | number,
): Promise<Record<string, string> | null> {
  const url = new URL('https://apis.data.go.kr/B551011/KorPetTourService/detailPetTour');
  url.searchParams.set('serviceKey', TOUR_API_KEY);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'daengroad');
  url.searchParams.set('_type', 'json');
  url.searchParams.set('contentId', String(contentId));

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const json = await res.json();
  return json.response?.body?.items?.item?.[0] ?? null;
}

// ═══════════════ 유틸 ═══════════════

function parsePetSize(acmpyTypeCd: string): number | null {
  // TourAPI acmpyTypeCd 예: "소형견(7kg)" 등 — 실제 포맷 확인 후 정밀화
  const m = acmpyTypeCd.match(/(\d+)\s*kg/i);
  return m ? Number(m[1]) : null;
}

function geohash7(lat: number, lng: number): string {
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
