import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { deleteChatRoom, getChatRoom, getChatRooms, sendChatMessage } from '../apis/feed'
import { Character } from '../components/v2/Character'
import { PillButton, TopicLabel } from '../components/v2/Controls'
import { IconButton, Screen } from '../components/v2/Screen'
import { Dialog } from '../components/ui/Dialog'
import { LineIcon } from '../components/ui/LineIcon'
import { RequestState } from '../components/ui/RequestState'
import { topicLabel } from '../constants/topics'
import type { ChatArticle, ChatMessage, ChatRoom } from '../types/news'
import { formatDot, formatListTime } from '../utils/date'

const suggestions = ['쉽게 설명해 줘', '나한테 어떤 영향이 있어?', '배경을 알려 줘']

function BotBubble({ children, typing }: { children?: ReactNode; typing?: boolean }) {
  return <div className="flex items-start gap-2">
    <Character size={32} />
    <div className="max-w-[260px] rounded-2xl rounded-tl-sm bg-surface px-[14px] py-[10px] text-sm leading-[21px] break-keep whitespace-pre-line">
      {typing ? <span role="status" aria-label="소식이가 답변을 만들고 있어요" className="flex h-[21px] items-center gap-1">{[0, 1, 2].map(dot => <span key={dot} style={{ animationDelay: `${dot * 150}ms` }} className="size-1.5 animate-bounce rounded-full bg-brand motion-reduce:animate-none" />)}</span> : children}
    </div>
  </div>
}

function UserMessage({ message }: { message: Pick<ChatMessage, 'text' | 'quote'> }) {
  return <div className="flex flex-col items-end gap-2">
    {message.quote && <>
      <span className="text-xs text-muted">드래그한 부분</span>
      <blockquote className="max-w-[280px] rounded-xl border border-line bg-white px-3 py-3 text-[13px] leading-5"><p className="border-l-2 border-brand pl-2 break-keep">{message.quote}</p></blockquote>
    </>}
    {message.text && <p className="max-w-[260px] rounded-2xl rounded-tr-sm bg-brand px-[14px] py-[10px] text-sm leading-[21px] break-keep whitespace-pre-line text-white">{message.text}</p>}
  </div>
}

function ArticleCard({ article, onOpen }: { article: ChatArticle; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-brand">
    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{article.title}</span>
      <span className="mt-1 block text-xs text-muted">{article.publisher} · {formatDot(article.publishedAt)}</span></span>
    <LineIcon name="next" size={20} />
  </button>
}

type Pending = { text: string; quote?: string; failed?: string }

/** C1 소식이 대화방: one room per article. A dragged quote arrives as the first question. */
export function ChatPage({ id, quote, onQuoteUsed, onBack, onHistory, onArticle }: { id: string; quote?: string; onQuoteUsed: () => void; onBack: () => void; onHistory: () => void; onArticle: () => void }) {
  const [data, setData] = useState<{ article: ChatArticle; room: ChatRoom | null; messages: ChatMessage[] }>()
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<Pending>()
  const bottomRef = useRef<HTMLDivElement>(null)
  const quoteRef = useRef(quote)
  const sending = useRef(false)

  async function send(message: { text: string; quote?: string }) {
    if (sending.current || (!message.text.trim() && !message.quote)) return
    sending.current = true
    setPending({ text: message.text.trim(), quote: message.quote })
    try {
      const result = await sendChatMessage(id, { text: message.text.trim(), ...(message.quote ? { quote: message.quote } : {}) })
      setData(value => value && { ...value, room: value.room ?? { article: value.article, createdAt: result.messages[0].createdAt, updatedAt: result.messages[1].createdAt }, messages: [...value.messages, ...result.messages] })
      setPending(undefined)
    } catch (cause) {
      setPending({ text: message.text.trim(), quote: message.quote, failed: (cause as Error).message })
    } finally { sending.current = false }
  }

  useEffect(() => {
    const controller = new AbortController()
    getChatRoom(id, controller.signal).then(value => {
      if (controller.signal.aborted) return
      setData(value)
      const first = quoteRef.current
      if (first) { quoteRef.current = undefined; onQuoteUsed(); void send({ text: '', quote: first }) }
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
    // `send` and `onQuoteUsed` only run once for the incoming quote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, version])

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }) }, [data?.messages.length, pending])

  function submit(event: FormEvent) {
    event.preventDefault()
    const text = input
    setInput('')
    void send({ text })
  }

  const header = <span className="flex items-center gap-2"><Character size={32} /><span>소식이</span></span>
  const historyButton = <button type="button" onClick={onHistory} className="-mr-2 flex h-10 cursor-pointer items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-secondary hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"><LineIcon name="clock" size={18} />기록</button>
  if (!data) return <Screen pageTitle="소식이" heading={header} onBack={onBack} right={historyButton}><RequestState loading={!error} error={error} onRetry={() => { setError(''); setVersion(value => value + 1) }} /></Screen>

  const empty = !data.messages.length && !pending
  const busy = Boolean(pending && !pending.failed)
  return <Screen pageTitle="소식이" heading={header} onBack={onBack} right={historyButton} contentClassName="px-5"
    footer={<div className="pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{suggestions.map(item =>
        <button key={item} type="button" disabled={busy} onClick={() => void send({ text: item })} className="h-9 shrink-0 cursor-pointer rounded-full border border-slate-300 bg-white px-4 text-[13px] font-medium text-secondary hover:bg-surface disabled:cursor-not-allowed disabled:text-slate-400">{item}</button>)}</div>
      <form onSubmit={submit} className="mt-3 flex gap-2 px-5">
        <input aria-label="소식이에게 질문하기" maxLength={1000} placeholder="소식이에게 물어보세요" value={input} onChange={event => setInput(event.target.value)}
          className="h-11 min-w-0 flex-1 rounded-full border border-slate-300 px-4 text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none" />
        <button type="submit" aria-label="보내기" disabled={!input.trim() || busy} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-300"><LineIcon name="up" size={20} /></button>
      </form>
      <p className="mt-2 px-5 text-center text-xs leading-[18px] text-muted">AI 답변이에요.<br />금액·날짜는 원문에서 확인해 주세요.</p>
    </div>}>
    <div className="sticky top-0 z-10 -mx-5 bg-white px-5 pb-3"><ArticleCard article={data.article} onOpen={onArticle} /></div>
    <div className="flex flex-col gap-4 pt-2 pb-4" aria-live="polite">
      {data.room ? <p className="text-center text-xs text-muted">{formatListTime(data.room.createdAt)} · 이 기사의 대화방을 만들었어요</p>
        : empty && <p className="text-center text-xs text-muted">아직 이 기사의 대화가 없어요</p>}
      {empty && <>
        <BotBubble>궁금한 부분을 드래그해 보세요.{'\n'}그 부분을 쉬운 말로 풀어 드릴게요.</BotBubble>
        <BotBubble>아래 질문을 눌러 바로 물어봐도 좋아요.{'\n'}첫 질문을 보내면 대화방이 만들어져요.</BotBubble>
      </>}
      {data.messages.map(message => message.role === 'user' ? <UserMessage key={message.id} message={message} /> : <BotBubble key={message.id}>{message.text}</BotBubble>)}
      {pending && <UserMessage message={pending} />}
      {pending && !pending.failed && <BotBubble typing />}
      {pending?.failed && <div role="alert" className="flex items-start gap-2"><Character size={32} />
        <div className="max-w-[240px] rounded-2xl rounded-tl-sm border border-[#f04452] bg-white p-3">
          <p className="flex items-center gap-1 text-sm font-bold"><LineIcon name="info" size={16} />답변을 만들지 못했어요</p>
          <p className="mt-1 pl-5 text-xs leading-[18px] text-muted">{pending.failed || '잠시 후 다시 시도해 주세요.'}</p>
          <button type="button" onClick={() => void send(pending)} className="mt-3 ml-5 h-9 cursor-pointer rounded-full bg-brand px-4 text-[13px] font-bold text-white">다시 시도</button>
        </div></div>}
      <div ref={bottomRef} />
    </div>
  </Screen>
}

/** C2 소식이 대화 기록: rooms by most recent activity, with deletion. */
export function ChatHistoryPage({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const [rooms, setRooms] = useState<ChatRoom[]>()
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [editing, setEditing] = useState(false)
  const [target, setTarget] = useState<ChatRoom>()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    getChatRooms(controller.signal).then(value => { if (!controller.signal.aborted) setRooms(value) })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [version])

  async function remove() {
    if (!target) return
    setDeleting(true); setDeleteError('')
    try {
      await deleteChatRoom(target.article.id)
      setRooms(value => value?.filter(room => room.article.id !== target.article.id))
      setTarget(undefined)
    } catch (cause) { setDeleteError((cause as Error).message) } finally { setDeleting(false) }
  }

  const right = rooms?.length ? <button type="button" onClick={() => setEditing(value => !value)} className="-mr-2 h-10 cursor-pointer rounded-lg px-2 text-[13px] font-medium text-secondary hover:bg-surface">{editing ? '완료' : '편집'}</button> : null
  return <>
    <Screen pageTitle="소식이 대화 기록" heading="소식이 대화 기록" onBack={onBack} right={right} contentClassName="px-5">
      {!rooms ? <RequestState loading={!error} error={error} onRetry={() => { setError(''); setVersion(value => value + 1) }} />
        : !rooms.length ? <div className="flex h-full flex-col items-center justify-center pb-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface text-secondary"><LineIcon name="chat" /></span>
          <p className="mt-4 text-[15px] font-bold">아직 대화 기록이 없어요</p>
          <p className="mt-2 text-[13px] text-muted">기사를 읽다가 궁금한 부분을 드래그해 보세요.</p>
        </div>
          : <ul className="divide-y divide-line border-b border-line">{rooms.map(room => <li key={room.article.id} className="flex items-center gap-2">
            <button type="button" onClick={() => onOpen(room.article.id)} className="min-w-0 flex-1 cursor-pointer py-4 text-left focus-visible:outline-2 focus-visible:outline-brand">
              <span className="flex items-center justify-between gap-2"><TopicLabel>{topicLabel(room.article.topicId)}</TopicLabel><span className="text-xs text-muted">{formatListTime(room.updatedAt)}</span></span>
              <span className="mt-2 block truncate text-[15px] font-bold">{room.article.title}</span>
              {room.lastMessage && <span className="mt-1 block truncate text-[13px] text-muted">{room.lastMessage.role === 'assistant' ? '소식이' : '나'}: {room.lastMessage.text}</span>}
            </button>
            {editing && <IconButton label={`${room.article.title} 대화 삭제`} onClick={() => { setDeleteError(''); setTarget(room) }} className="text-red-600"><LineIcon name="trash" size={20} /></IconButton>}
          </li>)}</ul>}
    </Screen>
    <Dialog open={Boolean(target)} labelledBy="delete-room-title" onClose={() => setTarget(undefined)}>
      <h2 id="delete-room-title" className="text-center text-lg font-bold">이 대화방을 삭제할까요?</h2>
      <p className="mt-2 text-center text-sm text-muted">삭제한 대화는 되돌릴 수 없어요.</p>
      {deleteError && <p role="alert" className="mt-2 text-center text-sm text-red-600">{deleteError}</p>}
      <div className="mt-5 flex gap-2"><PillButton variant="secondary" className="flex-1" onClick={() => setTarget(undefined)}>취소</PillButton>
        <PillButton className="flex-1 bg-red-600 hover:bg-red-700" disabled={deleting} onClick={remove}>{deleting ? '삭제하고 있어요' : '삭제'}</PillButton></div>
    </Dialog>
  </>
}
