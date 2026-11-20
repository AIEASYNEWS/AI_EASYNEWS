import { useState, type FormEvent, type ReactNode } from 'react'
import { checkNickname } from '../apis/profile'
import { ChoiceChip, FieldLabel, FieldMessage, PillButton, SideButton, TextInput } from '../components/v2/Controls'
import { FooterBar, Screen } from '../components/v2/Screen'
import { Dialog } from '../components/ui/Dialog'
import { LineIcon } from '../components/ui/LineIcon'
import { AGE_GROUPS, GENDERS, MAX_CUSTOM_KEYWORDS, NICKNAME_PATTERN, OCCUPATIONS, TOPICS } from '../constants/topics'
import type { TopicId } from '../types/onboarding'
import { infoComplete, type ProfileDraft } from '../utils/profileDraft'

type Update = (change: Partial<ProfileDraft>) => void
interface StepProps { draft: ProfileDraft; onChange: Update; onBack: () => void; error?: string; pending?: boolean }

/** A1-1 내 정보. `mode="edit"` drops the progress label and saves instead of moving on. */
export function InfoStep({ draft, onChange, onBack, onNext, mode = 'signup', error, pending, askConsent = mode === 'signup' }: StepProps & { onNext: () => void; mode?: 'signup' | 'edit'; askConsent?: boolean }) {
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const ready = infoComplete(draft)
  return <>
    <Screen pageTitle={mode === 'edit' ? '내 정보 수정' : '내 정보 (1/3)'} heading={mode === 'edit' ? '내 정보 수정' : '1/3'} onBack={onBack} contentClassName="px-5 pb-8"
      footer={<FooterBar note={error && <span role="alert" className="text-red-600">{error}</span>}><PillButton className="flex-1" disabled={!ready || pending} onClick={onNext}>{pending ? '저장하고 있어요' : mode === 'edit' ? '저장하기' : '다음'}</PillButton></FooterBar>}>
      <h1 className="mt-2 text-[22px] leading-[30px] font-bold">나에 대해 알려 주세요</h1>
      <p className="mt-2 flex items-center gap-1 text-[13px] text-muted"><LineIcon name="info" size={14} />입력한 정보는 맞춤 뉴스를 고르는 데만 써요.</p>
      <ChoiceGroup label="나이" className="mt-7">
        {AGE_GROUPS.map(age => <ChoiceChip key={age.id} label={age.label} selected={draft.ageGroup === age.id} onClick={() => onChange({ ageGroup: age.id })} />)}
      </ChoiceGroup>
      <p className="mt-2 text-xs text-muted">만 14세 이상만 가입할 수 있어요.</p>
      <ChoiceGroup label="성별" className="mt-6">
        {GENDERS.map(gender => <ChoiceChip key={gender.id} label={gender.label} selected={draft.gender === gender.id} onClick={() => onChange({ gender: gender.id })} />)}
      </ChoiceGroup>
      <ChoiceGroup label="직종" className="mt-6">
        {OCCUPATIONS.map(job => <ChoiceChip key={job.id} label={job.label} selected={draft.occupation === job.id} onClick={() => onChange({ occupation: job.id })} />)}
      </ChoiceGroup>
      {draft.occupation === 'other' && <TextInput className="mt-3" aria-label="직종 직접 입력" maxLength={30} placeholder="직종을 적어 주세요" value={draft.occupationOther} onChange={event => onChange({ occupationOther: event.target.value })} />}
      {askConsent && <div className="mt-6 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-secondary">
          <input type="checkbox" checked={draft.privacyConsent} onChange={event => onChange({ privacyConsent: event.target.checked })} className="size-5 cursor-pointer accent-brand" />
          개인정보 수집·이용 동의 (필수)
        </label>
        <button type="button" onClick={() => setPrivacyOpen(true)} className="cursor-pointer text-xs text-muted underline">자세히</button>
      </div>}
    </Screen>
    <Dialog open={privacyOpen} labelledBy="privacy-title" onClose={() => setPrivacyOpen(false)}>
      <h2 id="privacy-title" className="text-lg font-bold">개인정보 수집·이용 안내</h2>
      <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-[21px] text-secondary">
        <li>수집 항목: 나이대, 성별, 직종, 관심 분야, 닉네임</li>
        <li>이용 목적: 맞춤 뉴스 매칭률 계산과 화면 표시</li>
        <li>보관 기간: 계정을 삭제할 때까지</li>
        <li>동의하지 않으면 가입할 수 없어요.</li>
      </ul>
      <PillButton className="mt-5 w-full" onClick={() => setPrivacyOpen(false)}>확인</PillButton>
    </Dialog>
  </>
}

function ChoiceGroup({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return <fieldset className={className}><legend className="mb-3 text-sm font-bold">{label}</legend><div className="flex flex-wrap gap-2">{children}</div></fieldset>
}

/** A1-2 관심 분야: base categories plus up to 10 typed keywords. */
export function InterestsStep({ draft, onChange, onBack, onNext, mode = 'signup', error, pending }: StepProps & { onNext: () => void; mode?: 'signup' | 'edit' }) {
  const [keyword, setKeyword] = useState('')
  const [message, setMessage] = useState('')
  const count = draft.topicIds.length + draft.customKeywords.length
  function toggle(id: TopicId) {
    onChange({ topicIds: draft.topicIds.includes(id) ? draft.topicIds.filter(topic => topic !== id) : [...draft.topicIds, id] })
  }
  function add(event: FormEvent) {
    event.preventDefault()
    const value = keyword.trim().replace(/\s+/g, ' ')
    if (!value) return
    if (draft.customKeywords.length >= MAX_CUSTOM_KEYWORDS) { setMessage(`직접 입력한 분야는 최대 ${MAX_CUSTOM_KEYWORDS}개까지 추가할 수 있어요.`); return }
    if (value.length > 20 || !/^[\p{L}\p{N}][\p{L}\p{N} ·.-]*$/u.test(value)) { setMessage('글자와 숫자로 20자 이내로 적어 주세요.'); return }
    if (draft.customKeywords.includes(value) || TOPICS.some(topic => topic.label === value)) { setMessage('이미 고른 분야예요.'); return }
    onChange({ customKeywords: [...draft.customKeywords, value] })
    setKeyword(''); setMessage('')
  }
  return <Screen pageTitle={mode === 'edit' ? '관심 분야 수정' : '관심 분야 (2/3)'} heading={mode === 'edit' ? '관심 분야 수정' : '2/3'} onBack={onBack} contentClassName="px-5 pb-8"
    footer={<FooterBar note={error ? <span role="alert" className="text-red-600">{error}</span> : `${count}개 골랐어요`}>
      {mode === 'signup' && <PillButton variant="secondary" className="w-[84px]" onClick={onBack}>이전</PillButton>}
      <PillButton className="flex-1" disabled={!count || pending} onClick={onNext}>{pending ? '저장하고 있어요' : mode === 'edit' ? '저장하기' : '다음'}</PillButton>
    </FooterBar>}>
    <h1 className="mt-2 text-[22px] leading-[30px] font-bold">어떤 뉴스가 필요하세요?</h1>
    <p className="mt-2 text-[13px] text-muted">고른 분야로 기사를 찾아 매칭률을 알려 드려요.</p>
    <ChoiceGroup label="기본 카테고리" className="mt-7">
      {TOPICS.map(topic => <ChoiceChip key={topic.id} label={topic.label} selected={draft.topicIds.includes(topic.id)} onClick={() => toggle(topic.id)} />)}
    </ChoiceGroup>
    <form className="mt-7" onSubmit={add}>
      <FieldLabel htmlFor="custom-keyword">직접 입력</FieldLabel>
      <div className="flex gap-2"><TextInput id="custom-keyword" maxLength={20} placeholder="예: 백엔드, 장학금" value={keyword} onChange={event => { setKeyword(event.target.value); setMessage('') }} /><SideButton type="submit" disabled={!keyword.trim()}>추가</SideButton></div>
    </form>
    {draft.customKeywords.length > 0 && <div role="group" aria-label="직접 입력한 분야" className="mt-3 flex flex-wrap gap-2">
      {draft.customKeywords.map(word => <ChoiceChip key={word} small removable label={word} onClick={() => onChange({ customKeywords: draft.customKeywords.filter(item => item !== word) })} />)}
    </div>}
    <FieldMessage tone={message ? 'error' : 'hint'}>{message || `직접 입력한 분야는 최대 ${MAX_CUSTOM_KEYWORDS}개까지 추가할 수 있어요.`}</FieldMessage>
  </Screen>
}

/** A1-3 닉네임 with an explicit duplicate check. */
export function NicknameStep({ draft, onChange, onBack, onSubmit, error, pending, taken }: StepProps & { onSubmit: () => void; taken?: string }) {
  const [checked, setChecked] = useState<{ name: string; available: boolean }>()
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const name = draft.nickname.trim()
  const valid = NICKNAME_PATTERN.test(name)
  const available = taken === name ? false : checked?.name === name ? checked.available : undefined
  async function check() {
    if (!valid) return
    setChecking(true); setCheckError('')
    try { setChecked({ name, ...(await checkNickname(name)) }) } catch (cause) { setCheckError((cause as Error).message) } finally { setChecking(false) }
  }
  const message = checkError ? { tone: 'error' as const, text: checkError }
    : name && !valid ? { tone: 'error' as const, text: '한글·영문·숫자로 2~10자를 입력해 주세요.' }
      : available === false ? { tone: 'error' as const, text: '이미 쓰고 있어요. 다른 닉네임을 적어 주세요.' }
        : available ? { tone: 'success' as const, text: '쓸 수 있는 닉네임이에요' } : { tone: 'hint' as const, text: '한글·영문·숫자로 2~10자' }
  return <Screen pageTitle="닉네임 (3/3)" heading="3/3" onBack={onBack} contentClassName="px-5 pb-8"
    footer={<FooterBar note={error && <span role="alert" className="text-red-600">{error}</span>}>
      <PillButton variant="secondary" className="w-[84px]" onClick={onBack}>이전</PillButton>
      <PillButton className="flex-1" disabled={!available || pending} onClick={onSubmit}>{pending ? '준비하고 있어요' : '내 뉴스 찾기'}</PillButton>
    </FooterBar>}>
    <h1 className="mt-2 text-[22px] leading-[30px] font-bold">어떻게 불러 드릴까요?</h1>
    <p className="mt-2 text-[13px] text-muted">홈에서 ‘{valid ? name : '민서'}님께 맞는 뉴스’처럼 이 이름으로 불러 드려요.</p>
    <form className="mt-7" onSubmit={event => { event.preventDefault(); void check() }}>
      <FieldLabel htmlFor="nickname">닉네임</FieldLabel>
      <div className="flex gap-2"><TextInput id="nickname" maxLength={10} autoComplete="nickname" placeholder="닉네임을 입력해 주세요" invalid={message.tone === 'error'} value={draft.nickname} onChange={event => onChange({ nickname: event.target.value })} />
        <SideButton type="submit" disabled={!valid || checking}>{checking ? '확인 중' : '중복 확인'}</SideButton></div>
      <FieldMessage tone={message.tone}>{message.text}</FieldMessage>
    </form>
  </Screen>
}
