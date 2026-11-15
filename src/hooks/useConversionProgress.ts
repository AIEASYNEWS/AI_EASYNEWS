import { useEffect, useState } from 'react'
import { previewNewsService } from '../mocks/newsService'
import type { NewsArticle } from '../types/news'

interface ConversionProgressOptions {
  sourceUrl: string
  onSuccess: (article: NewsArticle) => void
  onFailure: () => void
}

export function useConversionProgress({ sourceUrl, onSuccess, onFailure }: ConversionProgressOptions) {
  const [step, setStep] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    const progressTimer = window.setInterval(() => setStep((current) => Math.min(3, current + 1)), 600)
    previewNewsService.convertArticle(sourceUrl, controller.signal)
      .then((article) => {
        if (!controller.signal.aborted) onSuccess(article)
      })
      .catch(() => {
        if (!controller.signal.aborted) onFailure()
      })
      .finally(() => window.clearInterval(progressTimer))

    return () => {
      controller.abort()
      window.clearInterval(progressTimer)
    }
  }, [sourceUrl, onSuccess, onFailure])

  return step
}
