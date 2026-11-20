import regionList from '../../functions/src/regions.json'

export interface Region { sido: string; sigungu: string }
/** 시·도 / 시·군·구 list shared with the server (functions/src/regions.json). */
export const REGIONS: readonly { sido: string; short: string; sigungu: string[] }[] = regionList
export const regionText = (region?: Region | null) => region ? `${region.sido} ${region.sigungu}` : ''
