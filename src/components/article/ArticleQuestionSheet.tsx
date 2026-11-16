import { useEffect, useRef, useState } from 'react'
import { askQuestion } from '../../apis/news'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'

const suggestedQuestions = ['왜 그런 거야?', '나한테 어떤 영향이 있어?', '배경을 알려 줘']
export function ArticleQuestionSheet({ sentence, articleId, sourceUrl, onClose }: { sentence: string; articleId: string; sourceUrl: string; onClose: () => void }) {
  const [input, setInput] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  useEffect(() => () => controllerRef.current?.abort(), [])

  async function ask(value: string) {
    if (!value.trim() || pending) return
    const controller = new AbortController()
    controllerRef.current = controller
    setPending(true); setError(''); setAnswer('')
    setQuestion(value.trim())
    setInput('')
    try { setAnswer((await askQuestion(articleId, sentence, value.trim(), sourceUrl, controller.signal)).answer) }
    catch (cause) { if (!controller.signal.aborted) setError((cause as Error).message) }
    finally { if (!controller.signal.aborted) setPending(false) }
  }

  return (
    <Dialog open labelledBy="question-sheet-title" onClose={onClose} sheet>
      <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-9 rounded-full bg-[#dddddd]" />
      <div className="flex items-center gap-2"><Icon name="sparkles" /><h2 id="question-sheet-title" className="flex-1 text-lg leading-[26px] font-bold">AI에게 물어보기</h2><button type="button" aria-label="질문 닫기" onClick={onClose} className="-mr-2 flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-[#f5f5f5] focus-visible:outline-2"><Icon name="close" /></button></div>
      <blockquote className="mt-4 rounded-lg border-l-[3px] border-[#333333] bg-[#f5f5f5] p-3"><p className="text-xs leading-[18px] text-[#777777]">선택한 문장</p><p className="mt-1 text-sm leading-[21px]">{sentence}</p></blockquote>
      {question ? (
        <div aria-live="polite" className="mt-4">
          <p className="ml-auto w-fit max-w-full rounded-xl bg-[#333333] px-3 py-2 text-sm leading-[21px] break-words text-white">{question}</p>
          <span className="mt-4 inline-block rounded bg-[#333333] px-2 py-1 text-xs leading-[18px] text-white">AI 답변</span>
          <p className="mt-2 text-base leading-6 whitespace-pre-line">{pending ? '기사 내용을 확인하며 답변하고 있어요.' : answer}</p>
          {error && <div role="alert"><p className="mt-2 text-sm text-[#b42318]">{error}</p><button type="button" onClick={() => ask(question)} className="mt-2 cursor-pointer text-sm underline">다시 시도</button></div>}
          <p className="mt-3 text-xs leading-[18px] text-[#777777]">AI 답변은 틀릴 수 있어요. 중요한 내용은 원문에서 확인해 주세요.</p>
        </div>
      ) : (
        <div className="mt-4"><p className="text-sm leading-[21px]">이런 걸 물어볼 수 있어요</p><div className="mt-2 flex flex-wrap gap-2">{suggestedQuestions.map((item) => <button key={item} type="button" onClick={() => ask(item)} className="cursor-pointer rounded-full border border-[#cccccc] px-3 py-2 text-sm leading-[21px] hover:bg-[#f5f5f5] focus-visible:outline-2">{item}</button>)}</div></div>
      )}
      <form onSubmit={(event) => { event.preventDefault(); ask(input) }} className="mt-4 flex gap-2"><input aria-label="기사에 관해 질문하기" maxLength={1000} placeholder="궁금한 점을 직접 물어보세요" value={input} onChange={(event) => setInput(event.target.value)} className="h-12 min-w-0 flex-1 rounded-lg border border-[#cccccc] px-3 text-sm outline-offset-2 placeholder:text-[#999999] focus-visible:outline-2" /><button type="submit" aria-label="질문 보내기" disabled={!input.trim() || pending} className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#333333] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><Icon name="send" /></button></form>
    </Dialog>
  )
}
