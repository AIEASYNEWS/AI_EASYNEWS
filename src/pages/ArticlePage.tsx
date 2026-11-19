import { useEffect, useMemo, useRef, useState } from 'react'
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
  const bodyRef = useRef<HTMLDivElement>(null)
  const easy = tab === 'easy'
  const paragraphs = useMemo(() => readableArticleParagraphs(easy ? article.easyParagraphs : article.originalParagraphs), [easy, article.easyParagraphs, article.originalParagraphs])
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    function trackSelection() {
      const selected = window.getSelection()
      const body = bodyRef.current
      if (!selected || selected.isCollapsed || !body?.contains(selected.anchorNode) || !body.contains(selected.focusNode)) {
        setSelection(null)
        return
      }
      const end = selected.getRangeAt(0).endContainer
      const paragraph = (end instanceof Element ? end : end.parentElement)?.closest<HTMLElement>('[data-paragraph-index]')
      const text = selected.toString().trim().slice(0, 5000)
      setSelection(text && paragraph ? { text, index: Number(paragraph.dataset.paragraphIndex) } : null)
    }
    document.addEventListener('selectionchange', trackSelection)
    return () => document.removeEventListener('selectionchange', trackSelection)
  }, [])

  return (
    <>
      <PageLayout title="기사 읽기" onBack={onBack} hero scrollMode="page">
        <div role="img" aria-label="기사 이미지 자리" className="h-[220px] overflow-hidden bg-surface">{article.imageUrl && <img src={article.imageUrl} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} className="size-full object-cover" />}</div>
        <div className="px-5 pt-6 pb-6">
          <h1 className="text-2xl leading-8 font-bold break-keep">{easy ? article.easyTitle : article.title}</h1>
          <p className="mt-2 text-xs leading-[18px] text-[#8b95a1]">{article.publisher} · {formatDate(article.publishedAt)}</p>
          <div role="tablist" aria-label="기사 보기 방식" className="mt-6 grid grid-cols-2 border-b border-line">
            {(['easy', 'original'] as const).map((value) => <button key={value} type="button" role="tab" id={`article-tab-${value}`} aria-selected={tab === value} aria-controls="article-content" onClick={() => { if (value === 'easy' && !article.easyParagraphs.length) onConvert(); else setTab(value); setSelection(null) }} className={`min-h-12 cursor-pointer border-b-2 px-3 py-3 text-base leading-6 focus-visible:outline-2 focus-visible:-outline-offset-2 ${tab === value ? 'border-brand font-bold text-brand' : 'border-transparent text-[#8b95a1]'}`}>{value === 'easy' ? '쉬운말 보기' : '원문 보기'}</button>)}
          </div>
          <div role="tabpanel" id="article-content" aria-labelledby={`article-tab-${tab}`} tabIndex={0} className="outline-offset-4">
            {easy && !article.easyParagraphs.length && <div className="mt-6"><p className="text-sm text-muted">쉬운말로 변환하면 본문과 핵심 요약을 볼 수 있어요.</p><Button className="mt-4" onClick={onConvert}>쉬운말로 변환하기</Button></div>}
            <div className="mt-6 flex flex-wrap items-center gap-2"><span className={`rounded px-2 text-xs leading-6 font-medium ${easy ? 'bg-brand-soft text-brand' : 'border border-line'}`}>{easy ? 'AI가 쉽게 바꾼 글' : '원문'}</span><span className="text-xs leading-[18px] text-muted">{easy ? '어려운 표현을 쉬운 말로 바꿨어요' : '언론사가 쓴 기사 그대로예요'}</span></div>
            {easy && <div className="mt-6 flex gap-2"><button type="button" onClick={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border border-[#d1d8e0] px-3 text-[13px] leading-5 font-medium text-secondary focus-visible:outline-2">핵심 요약<Icon name="chevron-down" /></button><span className="inline-flex h-8 items-center rounded-full border border-[#d1d8e0] px-3 text-[13px] leading-5 font-medium text-secondary">{article.reports.length > 0 ? `${article.reports.length}개의 언론사 비교` : '언론사 비교'}</span></div>}
            <div ref={bodyRef} className="mt-6 flex flex-col gap-4">
              {paragraphs.map((paragraph, index) => (
                <div key={`${tab}-${index}`} className="relative">
                  {selection?.index === index && <div onMouseDown={event => event.preventDefault()} className="absolute right-0 -top-12 z-10 flex h-10 items-center rounded-lg bg-[#2b3340] text-[13px] leading-5 font-medium text-white shadow-md"><button type="button" onClick={() => { void navigator.clipboard.writeText(selection.text).then(() => setCopyStatus('문장을 복사했어요.')).catch(() => setCopyStatus('문장을 복사하지 못했어요. 다시 시도해 주세요.')); window.getSelection()?.removeAllRanges(); setSelection(null) }} className="h-10 cursor-pointer px-[14px] focus-visible:outline-2">복사</button><span aria-hidden="true" className="h-5 border-l border-[#8b95a1]" /><button type="button" onClick={() => { setQuestionSentence(selection.text); window.getSelection()?.removeAllRanges(); setSelection(null) }} className="flex h-10 cursor-pointer items-center gap-[6px] px-[14px] focus-visible:outline-2"><Icon name="sparkles-light" />AI에게 물어보기</button></div>}
                  <p
                    data-paragraph-index={index}
                    tabIndex={0}
                    aria-keyshortcuts="Enter"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        setQuestionSentence(paragraph)
                      }
                    }}
                    className={`select-text break-keep text-pretty [overflow-wrap:anywhere] outline-offset-4 selection:bg-[#d6e6ff] ${easy ? 'text-[17px] leading-7' : 'text-base leading-7'}`}
                  >{paragraph}</p>
                </div>
              ))}
            </div>
            {easy && article.summary.length > 0 && <section ref={summaryRef} aria-labelledby="summary-heading" className="mt-6 scroll-mt-5 rounded-2xl bg-[#eaf0f7] p-4"><h2 id="summary-heading" className="text-base leading-6 font-bold">핵심 요약</h2><ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-[21px]">{article.summary.map((item) => <li key={item}>{item}</li>)}</ul></section>}
            {easy && article.reports.length > 0 && (
              <section aria-labelledby="related-heading" className="-mx-5 mt-6 border-t-[6px] border-[#eaf0f7] px-5 pt-6">
                <h2 id="related-heading" className="text-lg leading-[26px] font-bold">다른 언론사는 어떻게 보도했을까?</h2>
                <p className="mt-2 text-sm leading-[21px] text-muted">같은 사건을 다룬 기사 {article.reports.length}개를 옆으로 넘겨 비교해 보세요.</p>
                {article.comparison && <div className="mt-4 rounded-lg bg-[#eaf0f7] p-4">
                  <h3 className="text-sm leading-[18px] font-bold">보도 차이</h3>
                  <p className="mt-2 text-sm leading-[21px]">{article.reports.every(report => report.viewpoint)
                    ? article.reports.map(report => report.publisher + ': ' + report.viewpoint).join(' · ')
                    : article.comparison}</p>
                </div>}
                <RelatedReportsCarousel reports={article.reports} onRelated={onRelated} />
              </section>
            )}
          </div>
        </div>
        <div className="px-5 pb-6">
          <div className="mt-3 flex gap-4 text-xs leading-[18px] text-muted"><button type="button" className="cursor-pointer underline" onClick={() => { void navigator.clipboard.writeText(article.sourceUrl).then(() => setCopyStatus('기사 주소를 복사했어요.')).catch(() => setCopyStatus('복사하지 못했어요. 원문 링크를 이용해 주세요.')) }}>기사 URL 복사</button><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">언론사 원문 열기</a></div>{copyStatus && <p role="status" className="mt-2 text-xs text-muted">{copyStatus}</p>}
        </div>
        {easy && Boolean(article.sourcePositions?.length) && <section aria-labelledby="source-positions-heading" className="px-5 pb-6">
          <h2 id="source-positions-heading" className="text-lg font-bold">이 기사에 나온 입장</h2>
          <ul className="mt-3 space-y-3">{article.sourcePositions?.map(position =>
            <li key={position.evidence} className="rounded-xl border border-line p-4">
              <h3 className="text-sm font-bold">{position.speaker}</h3>
              <blockquote className="mt-2 border-l-2 border-brand pl-3 text-sm leading-6">{position.evidence}</blockquote>
            </li>)}</ul>
          <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-muted underline">{article.publisher} 원문 보기</a>
        </section>}
      </PageLayout>
      {questionSentence && <ArticleQuestionSheet key={questionSentence} sentence={questionSentence} articleId={article.id} sourceUrl={article.sourceUrl} onClose={() => { setQuestionSentence(''); setSelection(null) }} />}
    </>
  )
}
