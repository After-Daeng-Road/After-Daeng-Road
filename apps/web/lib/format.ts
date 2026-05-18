// 표시용 날짜·시간 포매터 (한국어 로케일)

export function formatDate(d: Date): string {
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '방금';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
