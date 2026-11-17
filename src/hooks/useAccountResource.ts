import { useEffect, useState } from 'react'

export function useAccountResource<T>(load: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<{ value?: T; error?: string; version: number }>()
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    load(controller.signal).then(value => {
      if (!controller.signal.aborted) setResult({ value, version })
    }).catch(cause => {
      if (!controller.signal.aborted) setResult({ error: cause.message, version })
    })
    return () => controller.abort()
  }, [load, enabled, version])
  return { ...(enabled && result?.version === version ? result : {}), retry: () => setVersion(v => v + 1) }
}
