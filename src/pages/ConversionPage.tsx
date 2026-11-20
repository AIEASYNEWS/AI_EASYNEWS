import { PageLayout } from '../components/layout/PageLayout'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { useConversionProgress } from '../hooks/useConversionProgress'
import type { NewsArticle } from '../types/news'

interface ConversionPageProps {
  sourceUrl: string
  onSuccess: (article: NewsArticle) => void
  onFailure: (error: Error) => void
  onCancel: () => void
}

const steps = ['기사를 읽는 중', '쉬운 말로 바꾸는 중']

export function ConversionPage({ sourceUrl, onSuccess, onFailure, onCancel }: ConversionPageProps) {
  const step = useConversionProgress({ sourceUrl, onSuccess, onFailure })

  return (
    <PageLayout title="쉬운말로 변환 중" footer={<div className="px-5 py-4"><Button variant="secondary" onClick={onCancel}>취소</Button></div>} contentClassName="px-5 pt-5 pb-6">
      <progress aria-label="기사 변환 진행률" max={steps.length} value={step} className="block h-2 w-full overflow-hidden rounded-full bg-slate-100 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-brand [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-brand" />
      <p className="mt-2 text-xs leading-[18px] text-muted">{step} / {steps.length} 단계</p>
      <h1 className="mt-8 text-2xl leading-8 font-bold break-keep">쉬운 말로 바꾸는 중이에요</h1>
      <p className="mt-2 text-sm leading-[21px] text-muted">잠시만 기다려 주세요. 기사가 길면 조금 더 걸릴 수 있어요.</p>
      <ol aria-live="polite" className="mt-8 flex flex-col gap-4">
        {steps.map((label, index) => {
          const done = index + 1 < step
          const current = index + 1 === step
          return <li key={label} className={`flex items-center gap-4 ${done || current ? 'text-ink' : 'text-muted'}`}>
            {done ? <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand"><Icon name="complete" /></span> : <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${current ? 'border-brand' : 'border-slate-300'}`}>{current && <span className="size-2 rounded-full bg-brand" />}</span>}
            <span className={`flex-1 text-base leading-6 ${current ? 'font-bold' : ''}`}>{label}</span><span className="text-xs leading-[18px]">{done ? '완료' : current ? '진행 중' : '대기'}</span>
          </li>
        })}
      </ol>
      <div className="mt-8 rounded-2xl border border-line bg-surface p-4"><p className="text-xs leading-[18px] text-muted">변환 중인 기사</p><p className="mt-2 text-sm leading-[21px] break-all text-secondary">{sourceUrl}</p></div>
    </PageLayout>
  )
}
