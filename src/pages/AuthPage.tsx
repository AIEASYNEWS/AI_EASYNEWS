import { useEffect, useState, type FormEvent } from 'react'
import { createUserWithEmailAndPassword, EmailAuthProvider, linkWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, authError } from '../apis/firebase'
import { apiRequest } from '../apis/client'
import { OnboardingLayout } from '../components/onboarding/OnboardingLayout'
import { Button } from '../components/ui/Button'

const idPattern = /^[a-z0-9_]{4,24}$/
const field = 'mt-2 h-12 w-full rounded-lg border border-slate-300 px-4 pr-11 text-sm focus:border-brand focus:outline-brand aria-invalid:border-red-500'

function PasswordField({ label, value, onChange, hint, invalid, signup }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; invalid?: boolean; signup: boolean
}) {
  const [visible, setVisible] = useState(false)
  return <div><label className="block text-sm font-semibold text-secondary">{label}
    <span className="relative block"><input required type={visible ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'}
      maxLength={128} aria-invalid={Boolean(invalid)} value={value} onChange={e => onChange(e.target.value)} className={field} placeholder={label + ' 입력'} />
      <button type="button" aria-label={label + (visible ? ' 숨기기' : ' 보기')} aria-pressed={visible} onClick={() => setVisible(!visible)}
        className="absolute right-0 bottom-0 grid size-12 place-items-center"><img src="/images/ui/password-eye.svg" alt="" /></button>
    </span></label>{hint && <p className={`mt-2 text-[13px] ${invalid ? 'text-red-600' : value ? 'text-brand' : 'text-muted'}`}>{hint}</p>}</div>
}

export function AuthPage({ signup = false, onBack, onSwitch, onSuccess }: { signup?: boolean; onBack: () => void; onSwitch: () => void; onSuccess: () => void }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [checked, setChecked] = useState<{ id: string; available: boolean }>()
  const normalized = id.trim().toLowerCase()
  const legacyEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && !normalized.endsWith('@id.easynews.invalid')
  const username = idPattern.test(normalized)
  const address = username ? normalized + '@id.easynews.invalid' : normalized
  const available = checked?.id === normalized ? checked.available : undefined
  const strong = password.length >= 8 && /[a-z]/i.test(password) && /[0-9]/.test(password)
  const valid = (username || legacyEmail) && password.length > 0 && (!signup || (available !== false && strong && password === confirm))
  useEffect(() => {
    if (!signup || !username) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      apiRequest<{ available: boolean }>(`/auth/username?id=${normalized}`, { signal: controller.signal, authenticated: false }).then(result => {
        if (!controller.signal.aborted) setChecked({ id: normalized, ...result })
      }).catch(() => { /* Firebase enforces uniqueness again when submitting. */ })
    }, 350)
    return () => { clearTimeout(timer); controller.abort() }
  }, [signup, username, normalized])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || pending) return
    if (!auth) { setError('로그인 서비스 설정을 확인해 주세요.'); return }
    setPending(true); setNotice(''); setError('')
    try {
      await auth.authStateReady()
      if (signup) {
        const credential = EmailAuthProvider.credential(address, password)
        const result = auth.currentUser?.isAnonymous ? await linkWithCredential(auth.currentUser, credential) : await createUserWithEmailAndPassword(auth, address, password)
        await updateProfile(result.user, { displayName: username ? normalized : normalized.split('@')[0] })
      } else await signInWithEmailAndPassword(auth, address, password)
      onSuccess()
    } catch (cause) {
      if (signup && username && (cause as { code?: string }).code === 'auth/email-already-in-use') setChecked({ id: normalized, available: false })
      else setError(authError(cause))
    } finally { setPending(false) }
  }
  async function reset() {
    if (!auth || !legacyEmail) return
    setPending(true); setError('')
    try { await sendPasswordResetEmail(auth, address); setNotice('가입된 이메일이면 비밀번호 재설정 안내가 전송돼요.') }
    catch (cause) { setError(authError(cause)) } finally { setPending(false) }
  }
  const invalidId = Boolean(id && !username && !legacyEmail)
  return <OnboardingLayout pageTitle={signup ? '회원가입' : '로그인'} title={signup ? '회원가입' : '로그인'} action={{ label: '뒤로 가기', icon: 'back', onClick: onBack }}
    footer={<div className="space-y-2"><Button form="account-form" type="submit" disabled={pending || !valid}>{pending ? '처리 중이에요' : signup ? '가입하고 시작하기' : '로그인'}</Button>
      <Button variant="text" onClick={onSwitch}>{signup ? '이미 계정이 있어요 · 로그인' : '아직 계정이 없나요? 회원가입'}</Button></div>}>
    <h2 className="whitespace-pre-line text-2xl leading-8 font-bold">{signup ? '아이디와 비밀번호를\n입력해 주세요' : '다시 만나서 반가워요'}</h2>
    <p className="mt-2 text-sm text-muted">{signup ? '가입하면 관심 주제에 맞는 뉴스를 추천해 드려요.' : '가입한 아이디와 비밀번호를 입력해 주세요.'}</p>
    <form id="account-form" className="mt-8 space-y-6" onSubmit={submit}>
      <div><label className="block text-sm font-semibold text-secondary">아이디<input autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={254} autoComplete="username" value={id} onChange={e => setId(e.target.value)} className={field}
        aria-invalid={signup && (invalidId || available === false)} placeholder={signup ? '영문 소문자·숫자·밑줄 4~24자' : '아이디 또는 기존 이메일'} /></label>
        {signup && id && <p aria-live="polite" className={`mt-2 text-[13px] ${invalidId || available === false ? 'text-red-600' : 'text-brand'}`}>{invalidId ? '영문 소문자·숫자·밑줄로 4~24자를 입력해 주세요.' : available === false ? '이미 사용 중인 아이디예요' : available ? '사용할 수 있는 아이디예요' : ''}</p>}</div>
      <PasswordField signup={signup} label="비밀번호" value={password} onChange={setPassword} hint={signup ? '영문·숫자를 섞어 8자 이상' : undefined} invalid={signup && Boolean(password) && !strong} />
      {signup && <PasswordField signup label="비밀번호 확인" value={confirm} onChange={setConfirm} hint={confirm ? password === confirm ? '비밀번호가 일치해요' : '비밀번호가 서로 달라요' : undefined} invalid={Boolean(confirm) && password !== confirm} />}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{notice && <p role="status" className="text-sm text-secondary">{notice}</p>}
      {!signup && legacyEmail && <Button variant="text" disabled={pending} onClick={reset}>비밀번호를 잊으셨나요?</Button>}
    </form>
  </OnboardingLayout>
}
