// 댕로드 — 한국관광 데이터랩(DataLabService) 실측으로 한적도 적재.
// 실행: npm run seed:datalab          (적재)
//       npm run seed:datalab -- --dry (DB 쓰기 없이 수집·계산만 검증)
//
// ═══ 이 스크립트가 푸는 문제 ═══
// 기존 seed.ts 는 base(55/70/80) + (sigungu+weekday*7+hour)%15-5 공식으로 만든 값을
// source='DATABANK_VISITOR'(데이터랩 실측 라벨) 로 저장했다. 서비스의 핵심 지표가
// 근거 없는 숫자였다. 이 스크립트가 그 자리를 실측으로 채운다.
//
// ═══ 산출 방식 (2층 구조) ═══
// 1층 — 요일·지역: 실측
//   locgoRegnVisitrDDList 는 일자·요일·시군구·방문자유형(현지인/외지인/외국인)을 준다.
//   외지인 비율 = 외지인 / (현지인 + 외지인)
//   한적도 = 100 - 외지인비율(%)
//
//   현지인이 아니라 외지인을 쓰는 이유: 현지인 통행은 통근·거주라 관광 혼잡과 무관하다.
//   비율을 쓰는 이유: 절대 방문자 수는 도시 크기에 지배된다(천안 32만 vs 공주 6만).
//   비율로 보면 공주 토요일 68.5% → 32점, 서산 수요일 24.6% → 75점으로
//   관광도시 특성이 그대로 드러난다.
//
// 2층 — 시간대: 추정
//   ⚠ 데이터랩에는 시간 축이 없다. 제공 축은 일자·요일·시군구·방문자유형 넷뿐이다.
//   따라서 시간대는 일반적인 관광 방문 패턴에 기반한 가중치이며 실측이 아니다.
//   화면에 반드시 그렇게 표기한다 (copy.ts quietnessBasis).
//
// ═══ 데이터 지연 ═══
// 데이터랩은 약 한 달 반~두 달 늦게 들어온다. 오늘 날짜로 조회하면 0건이다.
// LAG_DAYS 만큼 거슬러 올라간 지점부터 WEEKS 주치를 받는다.
//
// 멱등: (sigunguCode, weekday, hourSlot, source, poiId) 유니크 기준 upsert.
import { PrismaClient, QuietnessSource } from '@prisma/client';

const prisma = new PrismaClient();

const ENDPOINT = 'https://apis.data.go.kr/B551011/DataLabService/locgoRegnVisitrDDList';
const UA = 'Mozilla/5.0 (daengroad ETL)';
const DRY = process.argv.includes('--dry');

/** 데이터랩 반영 지연. 이보다 최근 날짜는 조회해도 0건이다. */
const LAG_DAYS = 60;
/** 요일별 평균을 낼 표본 주 수. 하루 1콜이라 7×WEEKS 콜을 쓴다(일일 한도 1000). */
const WEEKS = 8;
/** 동시 요청 수. 공공데이터포털 상대라 낮게 잡는다. */
const CONCURRENCY = 3;

/** 행정표준코드(데이터랩) → 프로젝트 sigunguCode(관광공사 체계). 두 체계가 다르다. */
const SIGUNGU_MAP: Record<string, { name: string; code: number }> = {
  '44130': { name: '천안', code: 33040 },
  '44150': { name: '공주', code: 33020 },
  '44200': { name: '아산', code: 33050 },
  '44210': { name: '서산', code: 33150 },
};

/**
 * 시간대 추정 가중치 (실측 아님).
 * 관광 방문은 정오~오후에 몰리고 이른 아침·늦은 저녁에 흩어진다는 일반 패턴을 반영한다.
 * 값은 ±10 이내로 제한해 실측 기준선을 뒤집지 않게 한다.
 * 데이터랩이 시간 축을 제공하지 않는 한 이 층은 추정으로 남는다.
 */
const HOUR_ADJUST: Record<number, number> = {
  9: 8, // 이른 시간 — 한적한 편
  12: -5, // 점심 — 붐빔
  15: -8, // 오후 — 가장 붐빔
  18: 0, // 퇴근 시간 — 중립
  21: 10, // 늦은 저녁 — 가장 한적
};
const KEY_HOURS = Object.keys(HOUR_ADJUST).map(Number);

type Row = { signguCode: string; daywkDivNm: string; touDivNm: string; touNum: string };

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** 조회 대상 날짜. 지연을 감안한 기준일에서 WEEKS 주치를 하루씩 거슬러 만든다. */
function targetDates(): Date[] {
  const end = new Date();
  end.setDate(end.getDate() - LAG_DAYS);
  const out: Date[] = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

async function fetchDay(date: Date): Promise<Row[]> {
  const key = process.env.TOUR_API_SERVICE_KEY;
  if (!key) throw new Error('TOUR_API_SERVICE_KEY 미설정 (apps/api/.env)');
  const s = ymd(date);
  const u = new URL(ENDPOINT);
  const params: Record<string, string> = {
    MobileOS: 'ETC',
    MobileApp: 'daengroad',
    _type: 'json',
    numOfRows: '2000',
    pageNo: '1',
    serviceKey: key,
    startYmd: s,
    endYmd: s,
  };
  // 지역 필터 파라미터가 없다 — areaCd/signguCd 를 넣으면 거부된다.
  // 전국 약 805행을 받아 여기서 충남 4개 시를 거른다.
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);

  const res = await fetch(u, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 비JSON 에러 */
  }
  const code = json?.response?.header?.resultCode ?? json?.resultCode;
  if (code !== '0000') {
    throw new Error(`데이터랩 ${s} 실패: code=${code ?? '?'} ${text.slice(0, 160)}`);
  }
  const item = json?.response?.body?.items?.item;
  const rows: Row[] = !item ? [] : Array.isArray(item) ? item : [item];
  return rows.filter((r) => SIGUNGU_MAP[r.signguCode]);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = cursor++;
        if (i >= items.length) return;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

/** 요일 이름 → 0(일)~6(토). Prisma weekday 컬럼 규약과 맞춘다. */
const WEEKDAY_INDEX: Record<string, number> = {
  일요일: 0,
  월요일: 1,
  화요일: 2,
  수요일: 3,
  목요일: 4,
  금요일: 5,
  토요일: 6,
};

type Bucket = { local: number; outside: number; days: number };

async function main() {
  console.log(DRY ? '🔍 데이터랩 한적도 검증 (DB 쓰기 없음)' : '🌱 데이터랩 한적도 적재');

  const dates = targetDates();
  console.log(
    `  조회 대상: ${ymd(dates[dates.length - 1])} ~ ${ymd(dates[0])} (${dates.length}일, 지연 ${LAG_DAYS}일 반영)`,
  );

  const perDay = await mapLimit(dates, CONCURRENCY, async (d, i) => {
    const rows = await fetchDay(d);
    if ((i + 1) % 14 === 0) console.log(`    ... ${i + 1}/${dates.length}일`);
    return rows;
  });

  // (시군구, 요일) 별로 현지인·외지인 합계를 모은다
  const buckets = new Map<string, Bucket>();
  let emptyDays = 0;
  for (const rows of perDay) {
    if (rows.length === 0) {
      emptyDays++;
      continue;
    }
    for (const r of rows) {
      const wd = WEEKDAY_INDEX[r.daywkDivNm];
      if (wd === undefined) continue;
      const k = `${r.signguCode}|${wd}`;
      const b = buckets.get(k) ?? { local: 0, outside: 0, days: 0 };
      const n = Number(r.touNum);
      if (!Number.isFinite(n)) continue;
      if (r.touDivNm.startsWith('현지인')) b.local += n;
      else if (r.touDivNm.startsWith('외지인')) {
        b.outside += n;
        b.days++;
      }
      buckets.set(k, b);
    }
  }

  if (buckets.size === 0) {
    throw new Error(
      '집계 결과 0건. 데이터랩 응답 형식이 바뀌었거나 지연이 커졌을 수 있다 — 조용히 넘기지 않는다',
    );
  }
  if (emptyDays > 0) console.log(`  (데이터 없는 날 ${emptyDays}일 — 지연 구간)`);

  // 기준선 계산 + 시간대 가중치 적용
  const now = new Date();
  const rowsToWrite: Array<{
    sigunguCode: number;
    weekday: number;
    hourSlot: number;
    score: number;
    sampleSize: number;
  }> = [];

  console.log('\n  시군  요일  외지인비율  기준선  시간대별(9·12·15·18·21)');
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  for (const [k, b] of [...buckets.entries()].sort()) {
    const [signgu, wdStr] = k.split('|');
    const meta = SIGUNGU_MAP[signgu];
    const weekday = Number(wdStr);
    const total = b.local + b.outside;
    if (total <= 0) continue;
    const ratio = b.outside / total;
    const baseline = Math.round(100 - ratio * 100);

    const perHour = KEY_HOURS.map((h) => {
      const score = Math.max(0, Math.min(100, baseline + HOUR_ADJUST[h]));
      rowsToWrite.push({
        sigunguCode: meta.code,
        weekday,
        hourSlot: h,
        score,
        sampleSize: b.days,
      });
      return score;
    });
    console.log(
      `  ${meta.name}  ${WD[weekday]}    ${(ratio * 100).toFixed(1).padStart(5)}%   ${String(baseline).padStart(4)}   ${perHour.join(' · ')}`,
    );
  }

  if (DRY) {
    console.log(`\n  ✓ 계산 완료 ${rowsToWrite.length}행 (쓰지 않음)`);
    return;
  }

  // 실측 라벨로 덮어쓴다. 합성 기준선(SYNTHETIC_BASELINE)은 건드리지 않는다.
  await prisma.quietnessScore.deleteMany({
    where: { source: QuietnessSource.DATABANK_VISITOR, poiId: null },
  });
  await prisma.quietnessScore.createMany({
    data: rowsToWrite.map((r) => ({
      ...r,
      source: QuietnessSource.DATABANK_VISITOR,
      computedAt: now,
    })),
  });
  console.log(`\n  ✓ quietness_scores ${rowsToWrite.length}행 적재 (source=DATABANK_VISITOR)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
