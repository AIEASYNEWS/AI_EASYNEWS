import { OnboardingLayout } from '../components/onboarding/OnboardingLayout'
import { Button } from '../components/ui/Button'

interface OnboardingPageProps { onLogin: () => void; onSignUp: () => void; onContinueAsGuest: () => void }
export function OnboardingPage({ onLogin, onSignUp, onContinueAsGuest }: OnboardingPageProps) {
  return <OnboardingLayout pageTitle="시작하기" action={{ label: '닫고 비회원으로 계속하기', icon: 'close', onClick: onContinueAsGuest }}
    footer={<div className="flex flex-col gap-2"><Button onClick={onLogin}>로그인</Button><Button variant="secondary" onClick={onSignUp}>회원가입</Button>
      <Button variant="text" onClick={onContinueAsGuest}>비회원으로 계속하기</Button></div>}>
    <section className="pt-[27px] text-center"><img src="/images/onboarding/aleum-blue.svg" alt="aleum" width="179" height="60" className="mx-auto" />
      <h1 className="mt-9 text-2xl leading-8 font-bold">어려운 뉴스, 쉬운 말로</h1>
      <p className="mt-2 text-sm text-secondary">로그인하면 나에게 맞는 뉴스를 더 편하게 볼 수 있어요.</p></section>
  </OnboardingLayout>
}
