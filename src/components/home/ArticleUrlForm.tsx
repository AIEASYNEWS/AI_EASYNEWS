import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

interface ArticleUrlFormProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (url: string) => void
  remaining: number | null
  failed: boolean
}

export function ArticleUrlForm({ value, onChange, onSubmit, remaining, failed }: ArticleUrlFormProps) {
  const [validation, setValidation] = useState('')
  const [pasting, setPasting] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const sourceUrl = value.trim()
    if (!sourceUrl) { setValidation('기사 URL을 입력해 주세요.'); return }
    try {
      const parsed = new URL(sourceUrl)
      if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) throw new Error('Invalid URL')
      setValidation('')
      onSubmit(parsed.href)
    } catch { setValidation('올바른 기사 주소를 입력해 주세요.') }
  }

  async function pasteUrl() {
    setPasting(true)
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) { setValidation('복사한 기사 주소가 없어요.'); return }
      onChange(text.trim())
      setValidation('')
    } catch {
      setValidation('주소를 읽지 못했어요. 입력란에 직접 붙여 넣어 주세요.')
    } finally { setPasting(false) }
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-[#dddddd] bg-[#f5f5f5] p-4">
      <label htmlFor="article-url" className="block text-sm leading-[21px] font-semibold text-[#333333]">뉴스 기사 주소</label>
      <div className="mt-4 flex gap-2">
        <input id="article-url" type="url" inputMode="url" autoComplete="url" spellCheck={false} value={value} onChange={(event) => { onChange(event.target.value); setValidation('') }} placeholder="기사 URL을 붙여 넣어 주세요" aria-invalid={Boolean(validation)} aria-describedby={validation ? 'url-validation' : failed ? 'conversion-error' : undefined} className="h-12 min-w-0 flex-1 rounded-lg border border-[#cccccc] bg-white px-4 text-sm leading-[21px] placeholder:text-[#777777] focus:border-[#333333] focus:outline-2 focus:outline-[#333333]" />
        <button type="button" disabled={pasting} onClick={pasteUrl} className="h-12 shrink-0 cursor-pointer rounded-lg bg-[#e0e0e0] px-4 text-sm font-medium text-[#333333] hover:bg-[#d5d5d5] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait">{pasting ? '읽는 중' : '붙여넣기'}</button>
      </div>
      {validation && <p id="url-validation" role="alert" className="mt-3 text-sm leading-[21px] text-[#b42318]">{validation}</p>}
      {failed && (
        <div id="conversion-error" role="alert" className="mt-4 flex gap-3 rounded-lg border border-[#333333] bg-white p-4">
          <Icon name="alert" />
          <div><p className="text-sm leading-[21px] font-bold">기사를 불러오지 못했어요</p><p className="mt-2 text-sm leading-[21px] text-[#777777]">주소가 맞는지 확인해 주세요.<br />지원하지 않는 사이트일 수도 있어요.</p></div>
        </div>
      )}
      <p className="mt-4 flex gap-2 text-xs leading-[18px] text-[#777777]">{remaining === null ? '구독 회원' : '오늘 남은 변환'}<strong className="font-bold text-[#111111]">{remaining === null ? '무제한 변환' : `${remaining}회`}</strong></p>
      <Button type="submit" className="mt-4">{failed ? '다시 시도' : '쉬운말로 변환하기'}</Button>
    </form>
  )
}
