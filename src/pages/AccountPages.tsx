import { useState, type FormEvent } from 'react'
import { createUserWithEmailAndPassword, EmailAuthProvider, linkWithCredential, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, authError } from '../apis/firebase'
import { checkUsername, saveProfile } from '../apis/profile'
import { FieldLabel, FieldMessage, PillButton, SideButton, TextInput } from '../components/v2/Controls'
import { Screen } from '../components/v2/Screen'
import { ID_PATTERN, strongPassword } from '../constants/topics'
import { InfoStep, InterestsStep, NicknameStep } from './ProfileSteps'
import { emptyDraft, type ProfileDraft } from '../utils/profileDraft'

const accountEmail = (id: string) => `${id}@id.easynews.invalid`
export interface AccountDraft { id: string; password: string; confirm: string; checkedId?: string; idTaken?: string }

/** A0 계정 만들기: ID duplicate check, password rules and confirmation. */
function AccountStep({ draft, onChange, onNext, onLogin }: { draft: AccountDraft; onChange: (change: Partial<AccountDraft>) => void; onNext: () => void; onLogin: () => void }) {
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const id = draft.id.trim().toLowerCase()
  const validId = ID_PATTERN.test(id)
  const available = draft.idTaken === id ? false : draft.checkedId === id ? true : undefined
  const strong = strongPassword(draft.password)
  const mismatch = Boolean(draft.confirm) && draft.confirm !== draft.password
  const ready = available === true && strong && draft.confirm === draft.password
  async function check(event: FormEvent) {
    event.preventDefault()
    if (!validId) return
    setChecking(true); setCheckError('')
    try {
      const result = await checkUsername(id)
      onChange(result.available ? { checkedId: id, idTaken: undefined } : { idTaken: id, checkedId: undefined })
    } catch (cause) { setCheckError((cause as Error).message) } finally { setChecking(false) }
  }
  const idMessage = checkError ? { tone: 'error' as const, text: checkError }
    : draft.id && !validId ? { tone: 'error' as const, text: '영문 소문자와 숫자로 4~16자를 입력해 주세요.' }
      : available === false ? { tone: 'error' as const, text: '이미 쓰고 있는 아이디예요' }
        : available ? { tone: 'success' as const, text: '쓸 수 있는 아이디예요' } : { tone: 'hint' as const, text: '영문 소문자와 숫자로 4~16자' }
  return <Screen pageTitle="계정 만들기" heading="계정 만들기" contentClassName="px-5 pb-8"
    footer={<div className="px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"><PillButton className="w-full" disabled={!ready} onClick={onNext}>다음</PillButton>
      <button type="button" onClick={onLogin} className="mt-2 h-10 w-full cursor-pointer text-[13px] font-medium text-secondary">이미 계정이 있어요</button></div>}>
    <img src="/images/onboarding/aleum-blue.svg" alt="aleum" width="72" height="24" className="mt-2 h-6 w-auto" />
    <h1 className="mt-2 text-[22px] leading-[30px] font-bold">나에게 맞는 뉴스를 찾으려면<br />계정이 필요해요</h1>
    <p className="mt-2 text-[13px] text-muted">아이디와 비밀번호만 정하면 바로 시작할 수 있어요.</p>
    <form className="mt-7" onSubmit={check}>
      <FieldLabel htmlFor="signup-id">아이디</FieldLabel>
      <div className="flex gap-2"><TextInput id="signup-id" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" maxLength={16} placeholder="아이디를 입력해 주세요" invalid={idMessage.tone === 'error'} value={draft.id} onChange={event => onChange({ id: event.target.value })} />
        <SideButton type="submit" disabled={!validId || checking}>{checking ? '확인 중' : '중복 확인'}</SideButton></div>
      <FieldMessage tone={idMessage.tone}>{idMessage.text}</FieldMessage>
    </form>
    <div className="mt-6">
      <FieldLabel htmlFor="signup-password">비밀번호</FieldLabel>
      <TextInput id="signup-password" type="password" autoComplete="new-password" maxLength={128} placeholder="비밀번호를 입력해 주세요" invalid={Boolean(draft.password) && !strong} value={draft.password} onChange={event => onChange({ password: event.target.value })} />
      <FieldMessage tone={draft.password && !strong ? 'error' : 'hint'}>영문·숫자·특수문자를 섞어 8자 이상</FieldMessage>
    </div>
    <div className="mt-6">
      <FieldLabel htmlFor="signup-confirm">비밀번호 확인</FieldLabel>
      <TextInput id="signup-confirm" type="password" autoComplete="new-password" maxLength={128} placeholder="비밀번호를 한 번 더 입력해 주세요" invalid={mismatch} value={draft.confirm} onChange={event => onChange({ confirm: event.target.value })} />
      {mismatch && <FieldMessage tone="error">비밀번호가 서로 달라요</FieldMessage>}
    </div>
  </Screen>
}

type Step = 'account' | 'info' | 'interests' | 'nickname'

/** A0 → A1-1 → A1-2 → A1-3. The account is created only at the final step so earlier steps can go back freely. */
export function SignupPage({ onLogin, onDone }: { onLogin: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>('account')
  const [account, setAccount] = useState<AccountDraft>({ id: '', password: '', confirm: '' })
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft)
  const [created, setCreated] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [takenNickname, setTakenNickname] = useState<string>()
  const update = (change: Partial<ProfileDraft>) => { setDraft(value => ({ ...value, ...change })); setError('') }

  async function finish() {
    if (!auth) { setError('로그인 서비스 설정을 확인해 주세요.'); return }
    const id = account.id.trim().toLowerCase()
    setPending(true); setError('')
    try {
      if (!created) {
        await auth.authStateReady()
        const credential = EmailAuthProvider.credential(accountEmail(id), account.password)
        // A guest's anonymous account is upgraded so earlier activity stays with the new member.
        const result = auth.currentUser?.isAnonymous ? await linkWithCredential(auth.currentUser, credential) : await createUserWithEmailAndPassword(auth, accountEmail(id), account.password)
        await updateProfile(result.user, { displayName: id })
        setCreated(true)
      }
      await saveProfile({
        ageGroup: draft.ageGroup, gender: draft.gender, occupation: draft.occupation, occupationOther: draft.occupation === 'other' ? draft.occupationOther.trim() : '',
        privacyConsent: true, topicIds: draft.topicIds, customKeywords: draft.customKeywords, nickname: draft.nickname.trim(), completed: true,
      })
      onDone()
    } catch (cause) {
      const code = (cause as { code?: string }).code
      if (code === 'auth/email-already-in-use' || code === 'auth/credential-already-in-use') {
        setAccount(value => ({ ...value, idTaken: id, checkedId: undefined })); setStep('account')
      } else if (code === 'NICKNAME_TAKEN') setTakenNickname(draft.nickname.trim())
      else setError(code?.startsWith('auth/') ? authError(cause) : (cause as Error).message)
    } finally { setPending(false) }
  }

  if (step === 'account') return <AccountStep draft={account} onChange={change => setAccount(value => ({ ...value, ...change }))} onNext={() => setStep('info')} onLogin={onLogin} />
  if (step === 'info') return <InfoStep draft={draft} onChange={update} onBack={() => setStep('account')} onNext={() => setStep('interests')} />
  if (step === 'interests') return <InterestsStep draft={draft} onChange={update} onBack={() => setStep('info')} onNext={() => setStep('nickname')} />
  return <NicknameStep draft={draft} onChange={update} onBack={() => setStep('interests')} onSubmit={finish} pending={pending} error={error} taken={takenNickname} />
}

/** A0 (가정) 로그인. Accounts made before v2 may still use an email address or the older ID format. */
export function LoginPage({ onBack, onSignUp, onSuccess }: { onBack: () => void; onSignUp: () => void; onSuccess: () => void }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const normalized = id.trim().toLowerCase()
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : /^[a-z0-9_]{4,24}$/.test(normalized) ? accountEmail(normalized) : ''
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!email || !password || pending) return
    if (!auth) { setError('로그인 서비스 설정을 확인해 주세요.'); return }
    setPending(true); setError('')
    try { await signInWithEmailAndPassword(auth, email, password); onSuccess() }
    catch (cause) { setError(authError(cause).replace('이메일', '아이디')) } finally { setPending(false) }
  }
  return <Screen pageTitle="로그인" heading="로그인" onBack={onBack} contentClassName="px-5 pb-8"
    footer={<div className="px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"><PillButton type="submit" form="login-form" className="w-full" disabled={!email || !password || pending}>{pending ? '로그인하고 있어요' : '로그인'}</PillButton>
      <button type="button" onClick={onSignUp} className="mt-2 h-10 w-full cursor-pointer text-[13px] font-medium text-secondary">계정 만들기</button></div>}>
    <h1 className="mt-2 text-[22px] leading-[30px] font-bold">다시 만나서 반가워요</h1>
    <p className="mt-2 text-[13px] text-muted">아이디와 비밀번호를 입력해 주세요.</p>
    <form id="login-form" className="mt-7 space-y-6" onSubmit={submit}>
      <div><FieldLabel htmlFor="login-id">아이디</FieldLabel><TextInput id="login-id" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" maxLength={254} value={id} onChange={event => setId(event.target.value)} /></div>
      <div><FieldLabel htmlFor="login-password">비밀번호</FieldLabel><TextInput id="login-password" type="password" autoComplete="current-password" maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </form>
  </Screen>
}

/** Edit screens reached from the home: A1-1 (내 정보) and A1-2 (관심 분야 수정 모드). */
export function ProfileEditPage({ kind, initial, onBack, onSaved }: { kind: 'info' | 'interests'; initial: ProfileDraft; onBack: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const update = (change: Partial<ProfileDraft>) => { setDraft(value => ({ ...value, ...change })); setError('') }
  async function save() {
    setPending(true); setError('')
    try {
      await saveProfile(kind === 'info'
        ? { ageGroup: draft.ageGroup, gender: draft.gender, occupation: draft.occupation, occupationOther: draft.occupation === 'other' ? draft.occupationOther.trim() : '', privacyConsent: true }
        : { topicIds: draft.topicIds, customKeywords: draft.customKeywords, completed: true })
      onSaved()
    } catch (cause) { setError((cause as Error).message) } finally { setPending(false) }
  }
  if (kind === 'info') return <InfoStep mode="edit" askConsent={!initial.privacyConsent} draft={draft} onChange={update} onBack={onBack} onNext={save} pending={pending} error={error} />
  return <InterestsStep mode="edit" draft={draft} onChange={update} onBack={onBack} onNext={save} pending={pending} error={error} />
}
