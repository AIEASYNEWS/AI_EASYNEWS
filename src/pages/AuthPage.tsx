import { useState, type FormEvent } from 'react'
import { createUserWithEmailAndPassword, EmailAuthProvider, linkWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, authError, usingEmulators } from '../apis/firebase'
import { PageLayout } from '../components/layout/PageLayout'
import { Button } from '../components/ui/Button'

export function AuthPage({ signup = false, onBack, onSwitch, onSuccess }: { signup?: boolean; onBack: () => void; onSwitch: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fieldClass = 'mt-2 h-12 w-full rounded-lg border border-[#cccccc] px-4 text-sm outline-offset-2 focus-visible:outline-2'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(''); setNotice('')
    if (!auth) { setError('로그인 서비스 연결을 준비 중이에요. 잠시 후 다시 시도해 주세요.'); return }
    if (signup && (!name.trim() || password.length < 8 || password !== confirm)) { setError(!name.trim() ? '이름을 입력해 주세요.' : password.length < 8 ? '비밀번호를 8자 이상 입력해 주세요.' : '비밀번호가 서로 달라요.'); return }
    setPending(true)
    try {
      if (signup) {
        const credential = EmailAuthProvider.credential(email.trim(), password)
        const result = auth.currentUser?.isAnonymous
          ? await linkWithCredential(auth.currentUser, credential)
          : await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(result.user, { displayName: name.trim() })
      } else await signInWithEmailAndPassword(auth, email.trim(), password)
      onSuccess()
    } catch (cause) { setError(authError(cause)) }
    finally { setPending(false) }
  }

  async function resetPassword() {
    if (!auth || !email.includes('@')) { setError('이메일 주소를 먼저 입력해 주세요.'); return }
    setPending(true); setError('')
    try { await sendPasswordResetEmail(auth, email.trim()); setNotice('가입된 이메일이면 비밀번호 재설정 안내가 전송돼요.') }
    catch (cause) { setError(authError(cause)) }
    finally { setPending(false) }
  }

  return <PageLayout title={signup ? '회원가입' : '로그인'} onBack={onBack} contentClassName="px-5 pt-5 pb-6">
    <h1 className="text-2xl leading-8 font-bold">{signup ? '쉬운말 뉴스 시작하기' : '다시 만나 반가워요'}</h1><p className="mt-2 text-sm leading-[21px] text-[#777777]">{signup ? '나에게 맞는 뉴스를 쉽게 읽어 보세요.' : '이메일로 로그인하고 관심 뉴스를 이어서 읽어 보세요.'}</p>
    {usingEmulators && <p className="mt-4 rounded-lg bg-[#f5f5f5] p-3 text-xs leading-[18px] text-[#777777]">로컬 테스트 환경이에요. 테스트용 이메일과 비밀번호를 사용해 주세요.</p>}
    <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
      {signup && <label className="text-sm font-medium">이름<input autoComplete="name" required maxLength={40} value={name} onChange={event => setName(event.target.value)} className={fieldClass} placeholder="이름을 입력해 주세요" /></label>}
      <label className="text-sm font-medium">이메일<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className={fieldClass} placeholder="example@email.com" /></label>
      <label className="text-sm font-medium">비밀번호<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 8 : undefined} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className={fieldClass} placeholder={signup ? '8자 이상 입력해 주세요' : '비밀번호를 입력해 주세요'} /></label>
      {signup && <label className="text-sm font-medium">비밀번호 확인<input type="password" autoComplete="new-password" required maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} className={fieldClass} placeholder="비밀번호를 한 번 더 입력해 주세요" /></label>}
      {error && <p role="alert" className="text-sm leading-[21px] text-[#b42318]">{error}</p>}{notice && <p role="status" className="text-sm leading-[21px] text-[#333333]">{notice}</p>}
      <Button type="submit" disabled={pending}>{pending ? '처리 중이에요' : signup ? '회원가입' : '로그인'}</Button>
    </form>
    {!signup && <Button variant="text" className="mt-2" disabled={pending} onClick={resetPassword}>비밀번호를 잊으셨나요?</Button>}
    <div className="mt-6 border-t border-[#e5e5e5] pt-6 text-center"><p className="text-sm text-[#777777]">{signup ? '이미 계정이 있나요?' : '아직 계정이 없나요?'}</p><Button variant="text" onClick={onSwitch}>{signup ? '로그인하기' : '회원가입하기'}</Button></div>
  </PageLayout>
}
