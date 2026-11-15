import { useState } from 'react'
import type { ViewerMode } from '../types/news'

const PREVIEW_ALLOWANCE = 3

/** 화면 확인용 횟수 상태. 실제 일일 한도는 API 연동 시 서버에서 관리한다. */
export function useConversionAllowance(viewer: ViewerMode) {
  const [usage, setUsage] = useState<Record<ViewerMode, number>>({ guest: 0, member: 0, subscriber: 0 })
  const remaining = viewer === 'subscriber' ? null : Math.max(0, PREVIEW_ALLOWANCE - (usage[viewer] ?? 0))

  function recordConversion() {
    setUsage((current) => ({ ...current, [viewer]: (current[viewer] ?? 0) + 1 }))
  }

  return { remaining, recordConversion }
}
