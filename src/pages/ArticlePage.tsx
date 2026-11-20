import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { getFeedDetail, getReason, sendFeedback, setBookmark } from '../apis/feed'
import { convertArticle, getArticlePreview } from '../apis/news'
import { ChatFab, Character } from '../components/v2/Character'
import { PillButton, TopicLabel } from '../components/v2/Controls'
import { IconButton, Screen } from '../components/v2/Screen'
import { LineIcon } from '../components/ui/LineIcon'
import { RequestState } from '../components/ui/RequestState'
import { topicLabel } from '../constants/topics'
import { useDragToAsk } from '../hooks/useDragToAsk'
import type { FeedDetail, NewsArticle } from '../types/news'
import { readableArticleParagraphs } from '../utils/articleText'
import { formatDot, relativeTime } from '../utils/date'
import { MatchBadge } from './HomePage'

export type ArticleTab = 'original' | 'easy'
type Conversion = { state: 'idle' } | { state: 'running'; step: number } | { state: 'failed'; message: string }

interface ArticlePageProps {
  id: string
  tab: ArticleTab
  onTab: (tab: ArticleTab) => void
  onBack: () => void
  onChat: (quote?: string) => void
  onQuotaExceeded: () => void
}

/** Renders `**강조**` from the easy rewrite as bold text. */
function Emphasis({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**') && part.length > 4
    ? <strong key={index} className="font-bold">{part.slice(2, -2)}</strong> : <span key={index}>{part.replaceAll('**', '')}</span>)}</>
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  return <div className="flex items-center gap-2 text-[13px]">
    <span className="w-[118px] shrink-0 text-secondary">{label}</span>
    <span className="h-2 flex-1 overflow-hidden rounded-full bg-line" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((value / max) * 100)}%` }} />
    </span>
    <span className="w-12 shrink-0 text-right text-secondary tabular-nums">{value} / {max}</span>
  </div>
}

function Tabs({ tab, onTab }: { tab: ArticleTab; onTab: (tab: ArticleTab) => void }) {
  return <div role="tablist" aria-label="기사 보기 방식" className="flex border-b border-line bg-white">
    {(['original', 'easy'] as const).map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => onTab(value)}
      className={`h-12 flex-1 cursor-pointer border-b-2 text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${tab === value ? 'border-ink font-bold text-ink' : 'border-transparent text-muted'}`}>
      {value === 'original' ? '원문 보기' : '쉬운말 보기'}</button>)}
  </div>
}

/** Body text whose dragged part can be sent to 소식이 with the button shown after the drag ends. */
function AskableBody({ children, onAsk }: { children: ReactNode; onAsk: (text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const selection = useDragToAsk(ref)
  const ask = (text: string) => { window.getSelection()?.removeAllRanges(); onAsk(text) }
  return <div ref={ref} className="relative">
    {selection && (selection.dragging
      ? <span role="status" style={{ top: Math.max(selection.top - 40, -8), left: selection.left }}
        className="pointer-events-none absolute z-10 h-8 rounded-full bg-ink/80 px-3 text-xs leading-8 font-medium whitespace-nowrap text-white">드래그한 부분을 소식이에게 물어볼 수 있어요</span>
      : <button type="button" data-ask-button onMouseDown={event => event.preventDefault()} onClick={() => ask(selection.text)}
        style={{ top: selection.bottom + 8, left: selection.left }}
        className="absolute z-10 flex h-9 cursor-pointer items-center gap-1 rounded-full bg-brand pr-3 pl-1 text-[13px] font-bold whitespace-nowrap text-white shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
        <Character size={32} className="scale-75 border-white bg-white" />소식이에게 물어보기</button>)}
    <div className="flex flex-col gap-4 select-text selection:bg-brand-soft selection:text-ink">{children}</div>
  </div>
}

const steps = ['기사를 읽는 중', '배경을 찾는 중', '쉬운 말로 바꾸는 중']

function Converting({ step }: { step: number }) {
  return <div className="mt-4 rounded-xl border border-line p-4" role="status" aria-live="polite">
    <div className="flex items-center gap-2"><Character size={32} /><p className="rounded-2xl bg-surface px-3 py-2 text-[13px] leading-5">기사를 쉬운 말로 바꾸고 있어요.<br />잠시만 기다려 주세요.</p></div>
    <ol className="mt-4 space-y-3">{steps.map((label, index) => {
      const status = step > index + 1 ? 'done' : step === index + 1 ? 'running' : 'waiting'
      return <li key={label} className="flex items-center gap-3 text-sm">
        <span className={`flex size-5 items-center justify-center rounded-full border-2 ${status === 'done' ? 'border-brand bg-brand text-white' : status === 'running' ? 'border-brand' : 'border-line'}`}>
          {status === 'done' ? <LineIcon name="check" size={12} /> : status === 'running' ? <span className="size-2 animate-pulse rounded-full bg-brand motion-reduce:animate-none" /> : null}</span>
        <span className={`flex-1 ${status === 'running' ? 'font-bold' : status === 'waiting' ? 'text-muted' : ''}`}>{label}</span>
        <span className="text-xs text-muted">{status === 'done' ? '완료' : status === 'running' ? '진행 중' : '대기'}</span>
      </li>
    })}</ol>
  </div>
}

export function ArticlePage({ id, tab, onTab, onBack, onChat, onQuotaExceeded }: ArticlePageProps) {
  const [detail, setDetail] = useState<FeedDetail>()
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [body, setBody] = useState<{ paragraphs: string[]; failed?: boolean }>()
  const [reason, setReason] = useState<{ text: string; failed?: boolean }>()
  const [converted, setConverted] = useState<NewsArticle | null>(null)
  const [conversion, setConversion] = useState<Conversion>({ state: 'idle' })
  const [feedback, setFeedbackState] = useState<'good' | 'bad' | null>(null)
  const [feedbackError, setFeedbackError] = useState('')
  const [bookmarked, setBookmarked] = useState(false)
  const conversionRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    getFeedDetail(id, controller.signal).then(value => {
      if (controller.signal.aborted) return
      setDetail(value); setConverted(value.converted); setFeedbackState(value.feedback); setBookmarked(value.bookmarked)
      if (value.reason) setReason({ text: value.reason })
      if (value.converted?.originalParagraphs.length) setBody({ paragraphs: value.converted.originalParagraphs })
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [id, version])

  const sourceUrl = detail?.sourceUrl
  const needsBody = Boolean(detail && !detail.converted?.originalParagraphs.length)
  useEffect(() => {
    if (!sourceUrl || !needsBody) return
    const controller = new AbortController()
    getArticlePreview(sourceUrl, controller.signal).then(value => { if (!controller.signal.aborted) setBody({ paragraphs: value.originalParagraphs }) })
      .catch(() => { if (!controller.signal.aborted) setBody({ paragraphs: [], failed: true }) })
    return () => controller.abort()
  }, [sourceUrl, needsBody])

  const needsReason = Boolean(detail && !detail.reason)
  useEffect(() => {
    if (!needsReason) return
    const controller = new AbortController()
    getReason(id, controller.signal).then(value => { if (!controller.signal.aborted) setReason({ text: value.reason }) })
      .catch(() => { if (!controller.signal.aborted) setReason({ text: '', failed: true }) })
    return () => controller.abort()
  }, [id, needsReason])

  useEffect(() => () => conversionRef.current?.abort(), [])

  const startConversion = useCallback(() => {
    if (!sourceUrl || conversionRef.current) return
    const controller = new AbortController()
    conversionRef.current = controller
    setConversion({ state: 'running', step: 1 })
    convertArticle(sourceUrl, step => setConversion({ state: 'running', step }), controller.signal)
      .then(article => { setConverted(article); setConversion({ state: 'idle' }) })
      .catch(cause => {
        if (controller.signal.aborted) return
        if ((cause as { code?: string }).code === 'QUOTA_EXCEEDED') onQuotaExceeded()
        setConversion({ state: 'failed', message: cause.message })
      })
      .finally(() => { if (conversionRef.current === controller) conversionRef.current = null })
  }, [sourceUrl, onQuotaExceeded])

  // Opening the easy tab is the request to convert.
  const easy = tab === 'easy'
  useEffect(() => {
    if (easy && detail && !converted && conversion.state === 'idle') startConversion()
  }, [easy, detail, converted, conversion.state, startConversion])
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [tab])

  if (!detail) return <Screen pageTitle="기사" onBack={onBack}><RequestState loading={!error} error={error} onRetry={() => { setError(''); setVersion(value => value + 1) }} /></Screen>

  const nick = detail.nickname ? `${detail.nickname}님` : '나'
  const nickTo = detail.nickname ? `${detail.nickname}님께` : '나에게'
  const showTabs = detail.difficult || Boolean(converted)
  const ask = (text: string) => onChat(text)
  const answerFeedback = async (value: 'good' | 'bad') => {
    setFeedbackError('')
    try { await sendFeedback(detail.id, value); setFeedbackState(value) } catch (cause) { setFeedbackError((cause as Error).message) }
  }
  const toggleBookmark = async () => {
    const next = !bookmarked
    setBookmarked(next)
    try { await setBookmark(detail.id, next) } catch { setBookmarked(!next) }
  }

  const originalBody = <section aria-label="기사 원문" className="pt-5">
    {!showTabs && <h2 className="mb-3 text-base font-bold">원문</h2>}
    {!body ? <p className="text-sm text-muted" role="status">원문을 불러오고 있어요.</p>
      : body.failed || !body.paragraphs.length ? <div className="text-sm leading-6 text-secondary"><p>{detail.excerpt}</p>
        <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[13px] text-brand underline">언론사 원문 열기</a></div>
        : <AskableBody onAsk={ask}>{readableArticleParagraphs(body.paragraphs).map((paragraph, index) => <p key={index} className="text-[15px] leading-[26px] break-keep text-pretty [overflow-wrap:anywhere]">{paragraph}</p>)}</AskableBody>}
    {detail.difficult && <PillButton className="mt-6 w-full" onClick={() => onTab('easy')}>쉬운말로 바꿔 보기</PillButton>}
  </section>

  const similarAndFeedback = <>
    <div aria-hidden="true" className="-mx-5 mt-8 h-2 bg-surface" />
    {detail.similar.length > 0 && <section aria-labelledby="similar-heading" className="pt-6">
      <h2 id="similar-heading" className="text-base font-bold">비슷한 기사도 있어요</h2>
      <ul className="mt-2 divide-y divide-line">{detail.similar.map(item => <li key={item.id}>
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-4 focus-visible:outline-2 focus-visible:outline-brand">
          <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold break-keep">{item.title}</p>
            {item.excerpt && <p className="mt-1 line-clamp-1 text-xs text-secondary">{item.excerpt}</p>}
            <p className="mt-1 text-xs text-muted">{item.publisher} · {relativeTime(item.publishedAt)}</p></div>
          <LineIcon name="next" size={20} className="text-muted" />
        </a></li>)}</ul>
    </section>}
    <section aria-labelledby="feedback-heading" className="mt-4 mb-24 rounded-xl bg-surface p-4">
      <h2 id="feedback-heading" className="text-[15px] font-bold">이 추천, {nick}과 맞았나요?</h2>
      {feedback ? <div role="status" className="mt-3"><p className="flex items-center gap-1 text-sm font-bold"><LineIcon name="check" size={18} />반영할게요</p>
        <p className="mt-1 text-[13px] leading-5 text-secondary">다음 매칭부터 {nickTo} 더 잘 맞는 기사를 찾아 드릴게요.</p></div>
        : <><div className="mt-3 flex gap-2"><PillButton variant="outline" className="h-10 flex-1 text-sm font-medium" onClick={() => answerFeedback('good')}>잘 맞아요</PillButton>
          <PillButton variant="secondary" className="h-10 flex-1 bg-line text-sm font-medium" onClick={() => answerFeedback('bad')}>관련 없어요</PillButton></div>
          <p className="mt-3 text-xs text-muted">답하면 다음 매칭에 반영돼요</p>
          {feedbackError && <p role="alert" className="mt-2 text-xs text-red-600">{feedbackError}</p>}</>}
    </section>
  </>

  if (easy) {
    return <Screen pageTitle="쉬운말 보기" onBack={onBack} scrollRef={scrollRef} contentClassName="px-5" overlay={<ChatFab onClick={() => onChat()} />}>
      <div className="flex items-center gap-2 pt-1 text-xs text-muted"><MatchBadge score={detail.match.score} /><span>{detail.publisher} · {formatDot(detail.publishedAt)}</span></div>
      <h1 className="mt-2 text-xl leading-7 font-bold break-keep">{detail.title}</h1>
      <div className="sticky top-0 z-10 -mx-5 mt-4 px-5"><Tabs tab={tab} onTab={onTab} /></div>
      {conversion.state === 'running' ? <Converting step={conversion.step} />
        : conversion.state === 'failed' ? <div className="mt-4">
          <div role="alert" className="rounded-xl border-2 border-ink p-4"><p className="flex items-center gap-2 text-sm font-bold"><LineIcon name="info" size={20} />쉬운말로 바꾸지 못했어요</p>
            <p className="mt-1 pl-7 text-[13px] leading-5 text-secondary">{conversion.message && !conversion.message.includes('잠시 후') ? `${conversion.message} ` : ''}잠시 후 다시 시도해 주세요. 원문은 원문 보기 탭에서 그대로 볼 수 있어요.</p></div>
          <PillButton className="mt-4 w-full" onClick={() => { setConversion({ state: 'idle' }); startConversion() }}>다시 시도</PillButton>
          <button type="button" onClick={() => onTab('original')} className="mt-2 h-10 w-full cursor-pointer text-[13px] font-medium text-secondary">원문 보기로 돌아가기</button>
        </div>
          : converted ? <article className="pb-24">
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="inline-flex h-6 items-center rounded-full bg-brand px-2 text-xs font-bold text-white">AI가 쉽게 바꾼 글</span>
              {Boolean(converted.changedCount) && <span className="text-xs text-muted">어려운 표현 {converted.changedCount}개를 바꿨어요</span>}</div>
            {converted.background && <section aria-labelledby="background-heading" className="mt-4 rounded-xl border border-line p-4">
              <h2 id="background-heading" className="flex items-center gap-1 text-[13px] font-bold"><LineIcon name="info" size={16} />읽기 전에 알아 두면 좋아요</h2>
              <p className="mt-2 text-[13px] leading-5 text-secondary">{converted.background}</p></section>}
            <p className="mt-4 text-xs leading-[18px] text-muted">본문을 드래그하고 ‘소식이에게 물어보기’를 누르면 그 부분을 물어볼 수 있어요.</p>
            <div className="mt-4"><AskableBody onAsk={ask}>{converted.easyParagraphs.map((paragraph, index) => <p key={index} className="text-[17px] leading-7 break-keep"><Emphasis text={paragraph} /></p>)}</AskableBody></div>
            {converted.summary.length > 0 && <section aria-labelledby="summary-heading" className="mt-8 rounded-xl bg-surface p-4">
              <h2 id="summary-heading" className="text-sm font-bold">핵심 요약</h2>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] leading-5 text-secondary">{converted.summary.map(item => <li key={item}>{item}</li>)}</ul></section>}
            {Boolean(converted.glossary?.length) && <section aria-labelledby="glossary-heading" className="mt-8">
              <h2 id="glossary-heading" className="text-base font-bold">낱말 풀이</h2>
              <dl className="mt-3 space-y-2">{converted.glossary?.map(entry => <div key={entry.term} className="rounded-xl border border-line p-4">
                <dt className="text-sm font-bold">{entry.term}</dt><dd className="mt-1 text-[13px] leading-5 text-secondary">{entry.meaning}</dd></div>)}</dl></section>}
            <p className="mt-6 flex gap-1 text-xs leading-[18px] text-muted"><LineIcon name="info" size={14} className="mt-0.5" />금액·날짜처럼 정확해야 하는 내용은 원문 보기에서 꼭 확인해 주세요.</p>
          </article> : <RequestState loading />}
    </Screen>
  }

  return <Screen pageTitle="기사 상세" onBack={onBack} scrollRef={scrollRef} contentClassName="px-5" overlay={<ChatFab onClick={() => onChat()} />}
    right={<IconButton label={bookmarked ? '저장 취소' : '기사 저장'} pressed={bookmarked} onClick={toggleBookmark} className="-mr-2"><LineIcon name="bookmark" filled={bookmarked} /></IconButton>}>
    <div className="mt-2 flex h-[175px] items-center justify-center overflow-hidden rounded-xl bg-surface text-muted">
      {detail.imageUrl ? <img src={detail.imageUrl} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} className="size-full object-cover" /> : <LineIcon name="image" size={32} />}
    </div>
    <div className="mt-4 flex flex-wrap gap-1">{detail.topics.map(topic => <TopicLabel key={topic}>{topicLabel(topic)}</TopicLabel>)}</div>
    <h1 className="mt-2 text-xl leading-7 font-bold break-keep">{detail.title}</h1>
    <p className="mt-2 text-xs text-muted">{detail.publisher} · {formatDot(detail.publishedAt)}</p>
    <section aria-label="매칭 분석" className="mt-4 rounded-xl border border-line p-4">
      <div className="flex items-center gap-4"><p className="text-[32px] leading-10 font-bold text-brand">{detail.match.score}%</p>
        <div><p className="text-[13px] text-muted">{nick}과의 매칭률</p><p className="text-base font-bold">{detail.match.grade}</p></div></div>
      <div className="mt-4 space-y-3">
        <ScoreBar label="관심 분야" value={detail.match.interest} max={50} />
        <ScoreBar label="내 정보(나이·직종)" value={detail.match.personal} max={30} />
        <ScoreBar label="시의성" value={detail.match.timeliness} max={20} />
      </div>
      <div className="mt-4 rounded-lg border border-line p-4">
        <h2 className="text-sm font-bold">{nickTo} 필요한 이유</h2>
        <p className="mt-2 text-[13px] leading-5 text-secondary" aria-live="polite">{reason ? reason.text || detail.why || '이 기사가 왜 필요한지 정리하지 못했어요.' : '필요한 이유를 정리하고 있어요.'}</p>
        {detail.match.matchedTags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{detail.match.matchedTags.map(tag => <span key={tag} className="rounded-full border border-line px-2 text-xs leading-6 text-secondary">{tag}</span>)}</div>}
      </div>
    </section>
    {showTabs && <div className="sticky top-0 z-10 -mx-5 mt-6 px-5"><Tabs tab={tab} onTab={onTab} /></div>}
    {originalBody}
    {similarAndFeedback}
  </Screen>
}
