import { useMemo, useRef, useState } from 'react'
import { RelatedReportsCarousel } from '../components/article/RelatedReportsCarousel'
import { ArticleQuestionSheet } from '../components/article/ArticleQuestionSheet'
import { PageLayout } from '../components/layout/PageLayout'
import { Icon } from '../components/ui/Icon'
import type { NewsArticle, RelatedReport } from '../types/news'
import { formatDate } from '../utils/date'
import { Button } from '../components/ui/Button'
import { readableArticleParagraphs } from '../utils/articleText'

interface ArticlePageProps {
  article: NewsArticle
  original?: boolean
  onBack: () => void
  onRelated: (report: RelatedReport) => void
  onConvert: () => void
}

export function ArticlePage({ article, original = false, onBack, onRelated, onConvert }: ArticlePageProps) {
  const [tab, setTab] = useState(original ? 'original' : 'easy')
  const [selection, setSelection] = useState<{ text: string; index: number } | null>(null)
  const [questionSentence, setQuestionSentence] = useState('')
  const summaryRef = useRef<HTMLElement>(null)
  const comparisonRef = useRef<HTMLElement>(null)
  const easy = tab === 'easy'
  const paragraphs = useMemo(() => readableArticleParagraphs(easy ? article.easyParagraphs : article.originalParagraphs), [easy, article.easyParagraphs, article.originalParagraphs])
  const [copyStatus, setCopyStatus] = useState('')

  function captureSelection(index: number) {
    const text = window.getSelection()?.toString().trim()
    if (text) setSelection({ text, index })
  }

  return (
    <>
      <PageLayout title="기사 읽기" onBack={onBack} hero scrollMode="page">
        <div role="img" aria-label="기사 이미지 자리" className="h-[120px] overflow-hidden bg-[#999999]">{article.imageUrl && <img src={article.imageUrl} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} className="size-full object-cover" />}</div>
        <div className="px-5 pt-6 pb-6">
          <h1 className="text-2xl leading-8 font-bold break-keep">{easy ? article.easyTitle : article.title}</h1>
          <p className="mt-3 text-xs leading-[18px] text-[#777777]">{article.publisher} · {formatDate(article.publishedAt)}</p>
          <div className="mt-3 flex gap-4 text-xs leading-[18px] text-[#777777]"><button type="button" className="cursor-pointer underline" onClick={() => { void navigator.clipboard.writeText(article.sourceUrl).then(() => setCopyStatus('기사 주소를 복사했어요.')).catch(() => setCopyStatus('복사하지 못했어요. 원문 링크를 이용해 주세요.')) }}>기사 URL 복사</button><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">언론사 원문 열기</a></div>{copyStatus && <p role="status" className="mt-2 text-xs text-[#777777]">{copyStatus}</p>}
          <div role="tablist" aria-label="기사 보기 방식" className="mt-6 grid grid-cols-2 border-b border-[#e0e0e0]">
            {(['easy', 'original'] as const).map((value) => <button key={value} type="button" role="tab" id={`article-tab-${value}`} aria-selected={tab === value} aria-controls="article-content" onClick={() => { if (value === 'easy' && !article.easyParagraphs.length) onConvert(); else setTab(value); setSelection(null) }} className={`min-h-12 cursor-pointer border-b-2 px-3 py-3 text-base leading-6 focus-visible:outline-2 focus-visible:-outline-offset-2 ${tab === value ? 'border-[#333333] font-bold text-[#111111]' : 'border-transparent text-[#777777]'}`}>{value === 'easy' ? '쉬운말 보기' : '원문 보기'}</button>)}
          </div>
          <div role="tabpanel" id="article-content" aria-labelledby={`article-tab-${tab}`} tabIndex={0} className="outline-offset-4">
            {easy && !article.easyParagraphs.length && <div className="mt-6"><p className="text-sm text-[#777777]">쉬운말로 변환하면 본문과 핵심 요약을 볼 수 있어요.</p><Button className="mt-4" onClick={onConvert}>쉬운말로 변환하기</Button></div>}
            <div className="mt-6 flex flex-wrap items-center gap-2"><span className={`rounded px-2 py-1 text-xs leading-[18px] ${easy ? 'bg-[#333333] text-white' : 'border border-[#333333]'}`}>{easy ? 'AI가 쉽게 바꾼 글' : '원문'}</span><span className="text-xs leading-[18px] text-[#777777]">{easy ? '어려운 표현을 쉬운 말로 바꿨어요' : '언론사가 쓴 기사 그대로예요'}</span></div>
            {easy && <div className="mt-6 flex gap-2"><button type="button" onClick={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#cccccc] px-3 py-2 text-sm leading-[21px] focus-visible:outline-2">핵심 요약<Icon name="chevron-down" /></button>{article.reports.length > 0 && <button type="button" onClick={() => comparisonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#cccccc] px-3 py-2 text-sm leading-[21px] focus-visible:outline-2">언론사 비교 {article.reports.length}<Icon name="chevron-down" /></button>}</div>}
            <div className="mt-6 flex flex-col gap-6">
              {paragraphs.map((paragraph, index) => (
                <div key={`${tab}-${index}`} className="relative">
                  {selection?.index === index && <div className="absolute right-0 -top-12 z-10 flex items-center gap-2 rounded-lg bg-[#333333] px-3 py-2 text-xs leading-[18px] text-white shadow-md"><button type="button" onClick={() => { void navigator.clipboard.writeText(selection.text).then(() => setCopyStatus('문장을 복사했어요.')).catch(() => setCopyStatus('문장을 복사하지 못했어요. 다시 시도해 주세요.')); setSelection(null) }} className="cursor-pointer px-1 focus-visible:outline-2">복사</button><span aria-hidden="true" className="h-4 border-l border-white/40" /><button type="button" onClick={() => setQuestionSentence(selection.text)} className="flex cursor-pointer items-center gap-1 focus-visible:outline-2"><Icon name="sparkles-light" />AI에게 물어보기</button></div>}
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
                    className={`select-text break-keep text-pretty [overflow-wrap:anywhere] outline-offset-4 selection:bg-[#e0e0e0] ${easy ? 'text-lg leading-8' : 'text-base leading-8'}`}
                  >{paragraph}</p>
                </div>
              ))}
            </div>
            {easy && article.summary.length > 0 && <section ref={summaryRef} aria-labelledby="summary-heading" className="mt-6 scroll-mt-5 rounded-2xl border border-[#dddddd] bg-[#f5f5f5] p-4"><h2 id="summary-heading" className="text-base leading-6 font-bold">핵심 요약</h2><ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-[21px]">{article.summary.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          </div>
        </div>
        {easy && article.comparisonNotice && <p role="status" className="px-5 pb-6 text-sm leading-[21px] text-[#777777]">{article.comparisonNotice}</p>}
        {easy && article.reports.length > 0 && <section ref={comparisonRef} aria-labelledby="comparison-heading" className="scroll-mt-5 border-t-[6px] border-[#dddddd] px-5 py-6">
          <h2 id="comparison-heading" className="text-lg leading-[26px] font-bold">같은 이슈, 다른 관점</h2>
          <p className="mt-2 text-sm leading-[21px] text-[#777777]">같은 사건·쟁점을 다르게 다룬 보도 {article.reports.length}개예요. 옆으로 넘기거나 화살표를 눌러 비교해 보세요.</p>
          {article.originalFocus && <div className="mt-4 rounded-xl border border-[#dddddd] p-4"><p className="text-xs leading-[18px] text-[#777777]">지금 읽은 기사의 관점</p><p className="mt-2 text-sm leading-[21px]">{article.originalFocus}</p></div>}
          <div className="mt-4 rounded-xl bg-[#f5f5f5] p-4"><p className="text-xs leading-[18px] text-[#777777]">관점이 다른 부분</p><p className="mt-2 text-sm leading-[21px]">{article.comparison}</p></div>
          <RelatedReportsCarousel key={article.id} reports={article.reports} onRelated={onRelated} />
        </section>}
      </PageLayout>
      {questionSentence && <ArticleQuestionSheet key={questionSentence} sentence={questionSentence} articleId={article.id} sourceUrl={article.sourceUrl} onClose={() => { setQuestionSentence(''); setSelection(null) }} />}
    </>
  )
}
