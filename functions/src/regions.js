import regions from './regions.json' with { type: 'json' }

// 시·도 / 시·군·구 (2026년 7월 인천 행정구역 개편 반영). The web app imports the same JSON.
export const REGIONS = regions
const bySido = new Map(REGIONS.map(region => [region.sido, region]))
const sigunguCount = new Map()
for (const region of REGIONS) for (const name of region.sigungu) sigunguCount.set(name, (sigunguCount.get(name) || 0) + 1)

export const isRegion = ({ sido, sigungu }) => Boolean(bySido.get(sido)?.sigungu.includes(sigungu))
export const regionLabel = ({ sido, sigungu }) => `${sido} ${sigungu}`
export const regionKey = region => regionLabel(region).replace(/\s+/g, '_')

/** News search term: the 시·군·구 name, prefixed by the short 시·도 name when the name exists elsewhere (중구, 고성군). */
export function regionQuery({ sido, sigungu }) {
  if (sido === '세종특별자치시') return '세종시'
  return sigunguCount.get(sigungu) > 1 ? `${bySido.get(sido)?.short || sido} ${sigungu}` : sigungu
}

/** Normalizes an AI-written place ("경북 경산시", "경산", "경상북도") to "시·도 시·군·구" or "시·도"; unknown → null. */
export function normalizeRegion(text) {
  const words = String(text || '').normalize('NFKC').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  const sido = REGIONS.find(region => words.some(word => word === region.sido || word === region.short))
  const rest = words.filter(word => !sido || (word !== sido.sido && word !== sido.short))
  const matchName = (names, word) => names.find(name => name === word || name.replace(/[시군구]$/, '') === word)
  if (sido) {
    const sigungu = rest.map(word => matchName(sido.sigungu, word)).find(Boolean)
    return sigungu ? regionLabel({ sido: sido.sido, sigungu }) : sido.sido
  }
  for (const word of rest) {
    const candidates = REGIONS.filter(region => matchName(region.sigungu, word))
    if (candidates.length === 1) return regionLabel({ sido: candidates[0].sido, sigungu: matchName(candidates[0].sigungu, word) })
  }
  return null
}
