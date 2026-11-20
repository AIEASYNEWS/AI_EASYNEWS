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
const pad = (value: number) => String(value).padStart(2, '0')
/** 2026.11.20 09:30 in Korean time. */
export function formatDot(value?: string | number) {
  const time = typeof value === 'number' ? value : Date.parse(value || '')
  if (!Number.isFinite(time)) return ''
  const date = new Date(time + 9 * 3600_000)
  return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}
/** 오늘 14:32 / 어제 / 11.17 in Korean time, for chat lists. */
export function formatListTime(value: number, now = Date.now()) {
  const day = (time: number) => Math.floor((time + 9 * 3600_000) / 86400_000)
  const date = new Date(value + 9 * 3600_000)
  const diff = day(now) - day(value)
  if (diff <= 0) return `오늘 ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  if (diff === 1) return '어제'
  return `${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCDate())}`
}
