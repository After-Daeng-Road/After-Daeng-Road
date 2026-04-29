// 댕로드 — Daily 추천 이메일 Edge Function (PRD §16.4 P0)
// pg_cron 매분 트리거 → 현재 시각(KST)이 user.email_notify_time 과 일치하는 사용자에게 발송
// 빈도 제한: 주중 최대 5회 (PRD §16.4)

// @ts-expect-error — Deno URL imports
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// @ts-expect-error — Deno global
const env = (k: string): string => Deno.env.get(k) ?? '';

const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE = env('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = env('RESEND_API_KEY');
const APP_URL = env('APP_URL') || 'https://daengroad.app';

const FROM_ADDRESS = '댕로드 <noreply@daengroad.app>';
const KST_OFFSET_HOURS = 9;
const WEEKDAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

type UserRow = {
  id: string;
  email: string;
  nickname: string | null;
  base_geohash7: string | null;
  email_notify_time: string;
  email_notify_days: string[];
};

// @ts-expect-error — Deno global
Deno.serve(async (_req: Request): Promise<Response> => {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const kst = new Date(now.getTime() + KST_OFFSET_HOURS * 3600 * 1000);
  const hhmm = `${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
  const dayKey = WEEKDAY_KEYS[kst.getUTCDay()];

  // 1. 발송 대상 후보: enabled + 현재 시각 + 요일 일치 + email 존재
  const { data: users, error } = await admin
    .from('users')
    .select('id, email, nickname, base_geohash7, email_notify_time, email_notify_days')
    .eq('email_notify_enabled', true)
    .eq('email_notify_time', hhmm)
    .not('email', 'is', null);

  if (error) {
    console.error('users query failed', error);
    return json({ error: 'query failed' }, 500);
  }

  // 2. 요일 필터 + 빈도 제한 (주중 최대 5회 — PRD §16.4)
  const candidates = (users ?? []).filter((u: UserRow) => u.email_notify_days.includes(dayKey));
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of candidates) {
    const allowed = await checkFrequency(admin, user.id);
    if (!allowed) {
      skipped++;
      continue;
    }

    try {
      const recommendations = await fetchTopPois(admin, user.base_geohash7);
      if (recommendations.length === 0) {
        skipped++;
        continue;
      }

      const subject = `오늘 ${user.email_notify_time} 퇴근하시나요? · 한적도 ${recommendations[0].quietness}점 코스 도착`;
      const html = renderEmail({
        nickname: user.nickname ?? '댕로드 친구',
        time: user.email_notify_time,
        recommendations,
        ctaUrl: `${APP_URL}/?utm_source=email&utm_medium=daily`,
        unsubscribeUrl: `${APP_URL}/me/settings?unsubscribe=1&u=${user.id}`,
      });

      const ok = await sendEmail(user.email, subject, html);
      if (!ok) {
        failed++;
        continue;
      }

      await admin.from('email_logs').insert({
        user_id: user.id,
        type: 'daily_recommend',
        subject,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      sent++;
    } catch (e) {
      console.error('send failed', user.id, e);
      failed++;
    }
  }

  return json({
    ok: true,
    time: hhmm,
    day: dayKey,
    candidates: candidates.length,
    sent,
    skipped,
    failed,
  });
});

// ═══════════════ 빈도 제한 ═══════════════

async function checkFrequency(admin: SupabaseClient, userId: string): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { count } = await admin
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'daily_recommend')
    .eq('status', 'sent')
    .gte('sent_at', since.toISOString());
  return (count ?? 0) < 5;
}

// ═══════════════ 추천 POI 조회 (간이 — 사용자 base 위치 근처 한적도 높은 곳) ═══════════════

async function fetchTopPois(
  admin: SupabaseClient,
  baseGeohash7: string | null,
): Promise<
  Array<{ id: string; name: string; address: string; quietness: number; image: string | null }>
> {
  // base 위치가 없으면 충남 천안 시드 사용
  const prefix = baseGeohash7 ? baseGeohash7.slice(0, 4) : 'wydq'; // 천안 근방 prefix
  const { data } = await admin
    .from('pois')
    .select('id, name, address, image_urls, sigungu_code')
    .eq('pet_allowed', true)
    .like('geohash7', `${prefix}%`)
    .limit(3);

  // 한적도 (간이: sigungu_code 기준 평균)
  const out: Array<{
    id: string;
    name: string;
    address: string;
    quietness: number;
    image: string | null;
  }> = [];
  for (const p of data ?? []) {
    const { data: q } = await admin
      .from('quietness_7d_avg')
      .select('avg_score')
      .eq('sigungu_code', p.sigungu_code)
      .limit(1)
      .maybeSingle();
    out.push({
      id: p.id,
      name: p.name,
      address: p.address ?? '',
      quietness: q?.avg_score ?? 75,
      image: p.image_urls?.[0] ?? null,
    });
  }
  out.sort((a, b) => b.quietness - a.quietness);
  return out;
}

// ═══════════════ 이메일 템플릿 (인라인 HTML) ═══════════════

function renderEmail(args: {
  nickname: string;
  time: string;
  recommendations: Array<{
    id: string;
    name: string;
    address: string;
    quietness: number;
    image: string | null;
  }>;
  ctaUrl: string;
  unsubscribeUrl: string;
}): string {
  const cards = args.recommendations
    .map(
      (r) => `
    <tr><td style="padding:12px 0;border-bottom:1px solid #eee;">
      ${r.image ? `<img src="${r.image}" width="80" height="80" style="border-radius:8px;float:left;margin-right:12px;" alt="" />` : ''}
      <strong style="font-size:14px;">${escape(r.name)}</strong><br/>
      <span style="font-size:12px;color:#888;">${escape(r.address)}</span><br/>
      <span style="font-size:11px;color:#22c55e;">🌿 한적도 ${r.quietness}점</span>
    </td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#f4f4f6;margin:0;padding:24px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
<tr><td style="padding:20px 24px;background:#f56500;color:white;font-size:18px;font-weight:bold;">🐕 댕로드</td></tr>
<tr><td style="padding:20px 24px;">
<p style="font-size:15px;margin:0 0 8px;">${escape(args.nickname)}님, 안녕하세요</p>
<p style="font-size:13px;color:#555;margin:0 0 16px;">오늘 ${args.time} 기준 한적한 펫 외출 후보 ${args.recommendations.length}곳 도착했어요.</p>
<table width="100%" cellpadding="0" cellspacing="0">${cards}</table>
<div style="text-align:center;margin-top:20px;"><a href="${args.ctaUrl}" style="display:inline-block;padding:12px 24px;background:#f56500;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">전체 추천 보기 →</a></div>
</td></tr>
<tr><td style="padding:14px 24px;background:#fafafa;font-size:11px;color:#999;text-align:center;"><a href="${args.unsubscribeUrl}" style="color:#999;">수신 거부</a></td></tr>
</table></body></html>`;
}

// ═══════════════ Resend ═══════════════

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY 미설정 — dry-run');
    return true;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });
  return res.ok;
}

// ═══════════════ 유틸 ═══════════════

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
