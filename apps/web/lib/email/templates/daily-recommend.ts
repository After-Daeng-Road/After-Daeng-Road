// PRD §16.4 일일 추천 이메일 템플릿
// "오늘 18시 퇴근하시나요? 충남 한적도 87점 코스가 새로 도착했어요"

type Recommendation = {
  name: string;
  address: string;
  imageUrl: string | null;
  reason: { distanceKm: number; etaMin: number; quietnessNow: number; verifiedCount: number };
};

export function dailyRecommendEmail(args: {
  nickname: string;
  emailNotifyTime: string;
  recommendations: Recommendation[];
  unsubscribeUrl: string;
  ctaUrl: string;
}): { subject: string; html: string; text: string } {
  const { nickname, emailNotifyTime, recommendations, unsubscribeUrl, ctaUrl } = args;
  const top = recommendations[0];
  const subject = top
    ? `오늘 ${emailNotifyTime} 퇴근하시나요? · 한적도 ${top.reason.quietnessNow}점 ${top.name}`
    : `${nickname}님, 오늘의 한적한 펫 외출 후보`;

  const cards = recommendations
    .map(
      (r) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eee;">
        ${r.imageUrl ? `<img src="${r.imageUrl}" width="80" height="80" style="border-radius:8px;float:left;margin-right:12px;" alt="" />` : ''}
        <strong style="font-size:14px;color:#222;">${escape(r.name)}</strong><br/>
        <span style="font-size:12px;color:#888;">${escape(r.address)}</span><br/>
        <span style="font-size:11px;color:#555;">📍 ${r.reason.distanceKm}km · ${r.reason.etaMin}분 · 한적도 ${r.reason.quietnessNow}점 · 검증 ${r.reason.verifiedCount}명</span>
      </td>
    </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#f4f4f6;margin:0;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:20px 24px;background:#f56500;color:white;font-size:18px;font-weight:bold;">🐕 댕로드</td></tr>
    <tr><td style="padding:20px 24px;">
      <p style="font-size:15px;color:#222;margin:0 0 8px;">${escape(nickname)}님, 안녕하세요</p>
      <p style="font-size:13px;color:#555;margin:0 0 16px;">오늘 ${emailNotifyTime} 기준 한적한 펫 외출 코스 ${recommendations.length}곳 도착했어요.</p>
      <table width="100%" cellpadding="0" cellspacing="0">${cards}</table>
      <div style="text-align:center;margin-top:20px;">
        <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;background:#f56500;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">전체 추천 보기 →</a>
      </div>
    </td></tr>
    <tr><td style="padding:14px 24px;background:#fafafa;font-size:11px;color:#999;text-align:center;">
      <a href="${unsubscribeUrl}" style="color:#999;">수신 거부</a>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${nickname}님, 오늘 ${emailNotifyTime} 한적한 펫 외출 후보:\n\n${recommendations
    .map(
      (r, i) => `${i + 1}. ${r.name} (${r.reason.distanceKm}km, 한적도 ${r.reason.quietnessNow}점)`,
    )
    .join('\n')}\n\n전체 보기: ${ctaUrl}\n수신 거부: ${unsubscribeUrl}`;

  return { subject, html, text };
}

function escape(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
