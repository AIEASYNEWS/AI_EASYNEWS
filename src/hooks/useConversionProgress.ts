import { useEffect, useState } from 'react'
import { convertArticle } from '../apis/news'
import type { NewsArticle } from '../types/news'

interface ConversionProgressOptions {
  sourceUrl: string
  onSuccess: (article: NewsArticle) => void
  onFailure: (error: Error) => void
}

export function useConversionProgress({ sourceUrl, onSuccess, onFailure }: ConversionProgressOptions) {
  const [step, setStep] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    convertArticle(sourceUrl, setStep, controller.signal)
      .then((article) => {
        if (!controller.signal.aborted) onSuccess(article)
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) onFailure(error)
      })

    return () => {
      controller.abort()
    }
  }, [sourceUrl, onSuccess, onFailure])

  return step
}
