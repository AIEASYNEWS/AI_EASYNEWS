import { useRef, useState } from 'react'
import { ArticleQuestionSheet } from '../components/article/ArticleQuestionSheet'
import { PageLayout } from '../components/layout/PageLayout'
import { Icon } from '../components/ui/Icon'
import type { NewsArticle, RelatedReport } from '../types/news'

interface ArticlePageProps {
  article: NewsArticle
  original?: boolean
  onBack: () => void
  onRelated: (report: RelatedReport) => void
}

export function ArticlePage({ article, original = false, onBack, onRelated }: ArticlePageProps) {
  const [tab, setTab] = useState(original ? 'original' : 'easy')
  const [selection, setSelection] = useState<{ text: string; index: number } | null>(null)
  const [questionSentence, setQuestionSentence] = useState('')
  const [activeReport, setActiveReport] = useState(0)
  const summaryRef = useRef<HTMLElement>(null)
  const comparisonRef = useRef<HTMLElement>(null)
  const reportsRef = useRef<(HTMLButtonElement | null)[]>([])
  const easy = tab === 'easy'

  function captureSelection(index: number) {
    const text = window.getSelection()?.toString().trim()
    if (text) setSelection({ text, index })
  }

  return (
    <>
      <PageLayout title="기사 읽기" onBack={onBack} hero scrollMode="page">
        <div role="img" aria-label="기사 이미지 자리" className="h-[120px] bg-[#999999]" />
        <div className="px-5 pt-6 pb-6">
          <h1 className="text-2xl leading-8 font-bold break-keep">{article.easyTitle}</h1>
          <p className="mt-3 text-xs leading-[18px] text-[#777777]">{article.publisher} · {article.publishedAt}</p>
          <div role="tablist" aria-label="기사 보기 방식" className="mt-6 grid grid-cols-2 border-b border-[#e0e0e0]">
            {(['easy', 'original'] as const).map((value) => <button key={value} type="button" role="tab" id={`article-tab-${value}`} aria-selected={tab === value} aria-controls="article-content" onClick={() => { setTab(value); setSelection(null) }} className={`min-h-12 cursor-pointer border-b-2 px-3 py-3 text-base leading-6 focus-visible:outline-2 focus-visible:-outline-offset-2 ${tab === value ? 'border-[#333333] font-bold text-[#111111]' : 'border-transparent text-[#777777]'}`}>{value === 'easy' ? '쉬운말 보기' : '원문 보기'}</button>)}
          </div>
          <div role="tabpanel" id="article-content" aria-labelledby={`article-tab-${tab}`} tabIndex={0} className="outline-offset-4">
            <div className="mt-6 flex flex-wrap items-center gap-2"><span className={`rounded px-2 py-1 text-xs leading-[18px] ${easy ? 'bg-[#333333] text-white' : 'border border-[#333333]'}`}>{easy ? 'AI가 쉽게 바꾼 글' : '원문'}</span><span className="text-xs leading-[18px] text-[#777777]">{easy ? '어려운 표현을 쉬운 말로 바꿨어요' : '언론사가 쓴 기사 그대로예요'}</span></div>
            {easy && <div className="mt-6 flex gap-2"><button type="button" onClick={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#cccccc] px-3 py-2 text-sm leading-[21px] focus-visible:outline-2">핵심 요약<Icon name="chevron-down" /></button>{article.reports.length > 0 && <button type="button" onClick={() => comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#cccccc] px-3 py-2 text-sm leading-[21px] focus-visible:outline-2">언론사 비교 {article.reports.length}<Icon name="chevron-down" /></button>}</div>}
            <div className="mt-6 flex flex-col gap-5">
              {(easy ? article.easyParagraphs : article.originalParagraphs).map((paragraph, index) => (
                <div key={`${tab}-${index}`} className="relative">
                  {selection?.index === index && <div className="absolute right-0 -top-12 z-10 flex items-center gap-2 rounded-lg bg-[#333333] px-3 py-2 text-xs leading-[18px] text-white shadow-md"><button type="button" onClick={() => { void navigator.clipboard.writeText(selection.text).catch(() => {}); setSelection(null) }} className="cursor-pointer px-1 focus-visible:outline-2">복사</button><span aria-hidden="true" className="h-4 border-l border-white/40" /><button type="button" onClick={() => setQuestionSentence(selection.text)} className="flex cursor-pointer items-center gap-1 focus-visible:outline-2"><Icon name="sparkles-light" />AI에게 물어보기</button></div>}
                  <p
                    tabIndex={0}
                    aria-keyshortcuts="Enter"
                    onMouseUp={() => captureSelection(index)}
                    onTouchEnd={() => captureSelection(index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        setQuestionSentence(paragraph)
                      }
                    }}
                    className={`select-text break-keep outline-offset-4 selection:bg-[#e0e0e0] ${easy ? 'text-lg leading-7' : 'text-base leading-7'}`}
                  >{paragraph}</p>
                </div>
              ))}
            </div>
            {easy && <section ref={summaryRef} aria-labelledby="summary-heading" className="mt-6 scroll-mt-5 rounded-2xl border border-[#dddddd] bg-[#f5f5f5] p-4"><h2 id="summary-heading" className="text-base leading-6 font-bold">핵심 요약</h2><ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-[21px]">{article.summary.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          </div>
        </div>
        {easy && article.reports.length > 0 && <section ref={comparisonRef} aria-labelledby="comparison-heading" className="scroll-mt-5 border-t-[6px] border-[#dddddd] px-5 py-6">
          <h2 id="comparison-heading" className="text-lg leading-[26px] font-bold">다른 언론사는 어떻게 보도했을까?</h2>
          <p className="mt-2 text-sm leading-[21px] text-[#777777]">같은 사건을 다룬 기사 {article.reports.length}개를 옆으로 넘겨 비교해 보세요.</p>
          <div className="mt-4 rounded-xl bg-[#f5f5f5] p-4"><p className="text-xs leading-[18px] text-[#777777]">보도 차이</p><p className="mt-2 text-sm leading-[21px]">{article.comparison}</p></div>
          <div aria-label="다른 언론사 보도" onScroll={(event) => { const el = event.currentTarget; const width = el.firstElementChild?.getBoundingClientRect().width ?? 260; setActiveReport(Math.min(article.reports.length - 1, Math.round(el.scrollLeft / (width + 12)))) }} className="-mr-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pr-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {article.reports.map((report, index) => <button key={report.id} ref={(element) => { reportsRef.current[index] = element }} type="button" onClick={() => onRelated(report)} className="w-[260px] shrink-0 cursor-pointer snap-start rounded-xl border border-[#dddddd] p-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2"><span className="rounded bg-[#f5f5f5] px-2 py-1 text-xs leading-[18px] text-[#333333]">{report.kind === 'same-event' ? '같은 사건 보도' : '다른 관점'}</span><p className="mt-3 text-xs leading-[18px] text-[#777777]">{report.publisher} · 2026.11.13</p><h3 className="mt-2 text-base leading-6 font-bold break-keep">{report.title}</h3><p className="mt-2 text-sm leading-[21px] text-[#777777]">강조한 내용: {report.focus}</p></button>)}
          </div>
          <div aria-label="비교 기사 페이지" className="mt-2 flex justify-center gap-1">{article.reports.map((report, index) => <button key={report.id} type="button" aria-label={`${index + 1}번 기사 보기`} aria-current={activeReport === index ? 'true' : undefined} onClick={() => reportsRef.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })} className="flex size-6 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2"><span className={`size-1.5 rounded-full ${activeReport === index ? 'bg-[#333333]' : 'bg-[#dddddd]'}`} /></button>)}</div>
        </section>}
      </PageLayout>
      {questionSentence && <ArticleQuestionSheet key={questionSentence} sentence={questionSentence} topicId={article.topicId} onClose={() => { setQuestionSentence(''); setSelection(null) }} />}
    </>
  )
}
