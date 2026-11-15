import { FeatureItem } from '../components/onboarding/FeatureItem'
import { OnboardingLayout } from '../components/onboarding/OnboardingLayout'
import { Button } from '../components/ui/Button'

interface OnboardingPageProps {
  onLogin: () => void
  onSignUp: () => void
  onContinueAsGuest: () => void
}

export function OnboardingPage({ onLogin, onSignUp, onContinueAsGuest }: OnboardingPageProps) {
  return (
    <OnboardingLayout
      pageTitle="시작하기"
      action={{ label: '닫고 비회원으로 계속하기', icon: 'close', onClick: onContinueAsGuest }}
      footer={
        <div className="flex flex-col gap-2">
          <Button onClick={onLogin}>로그인</Button>
          <Button variant="secondary" onClick={onSignUp}>회원가입</Button>
          <Button variant="text" onClick={onContinueAsGuest}>비회원으로 계속하기</Button>
        </div>
      }
    >
      <section aria-labelledby="onboarding-heading">
        <p className="text-sm leading-[21px] font-semibold text-[#333333]">쉬운말 뉴스</p>
        <h1 id="onboarding-heading" className="mt-2 text-2xl leading-8 font-bold break-keep">어려운 뉴스, 쉬운 말로</h1>
        <p className="mt-2 text-sm leading-[21px] break-keep text-[#777777]">로그인하면 나에게 맞는 뉴스를 더 편하게 볼 수 있어요.</p>
      </section>
      <ul aria-label="로그인하면 쓸 수 있는 기능" className="mt-8 flex flex-col gap-6">
        <FeatureItem icon="tag" title="관심 주제 맞춤 추천" description="고른 주제에 맞는 뉴스를 메인 화면에서 바로 볼 수 있어요." />
        <FeatureItem icon="bell" title="관심 주제 새 기사 알림" description="관심 있는 주제의 새 기사가 나오면 알려 드려요." />
      </ul>
    </OnboardingLayout>
  )
}
