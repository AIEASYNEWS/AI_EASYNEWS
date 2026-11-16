export function formatDate(value?: string) {
  if (!value) return '발행일 미상'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}
export function relativeTime(value: string) {
  const date = Date.parse(value)
  if (Number.isNaN(date)) return '발행일 미상'
  const minutes = Math.max(0, Math.floor((Date.now() - date) / 60_000))
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`
  return `${Math.floor(minutes / 1440)}일 전`
}
