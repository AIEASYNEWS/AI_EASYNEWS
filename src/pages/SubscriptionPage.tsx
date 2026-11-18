import { useState } from 'react'
import { auth } from '../apis/firebase'
import { activateDemoSubscription, getSubscription } from '../apis/account'
import { useAccountResource } from '../hooks/useAccountResource'
import { OnboardingLayout } from '../components/onboarding/OnboardingLayout'
import { Button } from '../components/ui/Button'
import { RequestState } from '../components/ui/RequestState'

export function SubscriptionPage({ onBack, onActivated }: { onBack: () => void; onActivated: () => void }) {
  const { value: plan, error, retry } = useAccountResource(getSubscription)
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState('')
  const url = plan?.active ? plan.managementUrl : plan?.checkoutUrl
  const canActivateDemo = Boolean(plan?.demo && !plan.active)

  async function subscribe() {
    if (canActivateDemo) {
      setActivating(true)
      setActivationError('')
      try {
        const result = await activateDemoSubscription()
        if (!result.active) throw new Error('구독을 활성화하지 못했어요. 다시 시도해 주세요.')
        onActivated()
      } catch (cause) {
        setActivationError((cause as Error).message)
      } finally {
        setActivating(false)
      }
      return
    }
    if (url) {
      if (!plan?.active) sessionStorage.setItem('easynews:checkout', auth?.currentUser?.uid ?? '')
      window.location.assign(url)
    }
  }

  return <OnboardingLayout title="구독 안내" pageTitle="구독 안내" action={{ label: '닫기', icon: 'close', onClick: onBack }} footer={<div className="space-y-2">
    <p className="text-center text-sm text-muted" role={activationError ? 'alert' : undefined}>{activationError || (plan?.active ? '현재 무제한 변환을 이용 중이에요.' : canActivateDemo ? '결제 없이 무제한 변환을 시작할 수 있어요.' : url ? '결제 금액과 갱신 조건을 확인한 뒤 구독해 주세요.' : '구독 상품을 준비하고 있어요.')}</p>
    <Button disabled={activating || (!canActivateDemo && !url)} onClick={subscribe}>{activating ? '구독 시작 중' : plan?.active ? '구독 관리' : '구독하기'}</Button>
    <Button variant="text" onClick={onBack}>나중에 하기</Button></div>}>
    <h2 className="text-2xl font-bold">쉬운말 변환, 무제한으로</h2>
    <p className="mt-2 text-sm leading-[21px] text-muted">구독하면 하루 횟수 제한 없이<br />어떤 기사든 쉬운 말로 바꿔 읽을 수 있어요.</p>
    {plan ? <><h3 className="mt-6 text-lg font-bold">회원과 구독 회원 비교</h3>
      <div className="mt-4 overflow-hidden rounded-2xl border border-line"><table className="w-full text-sm">
        <thead className="bg-surface"><tr>{['기능', '회원', '구독 회원'].map(label => <th key={label} className="p-3 first:text-left">{label}</th>)}</tr></thead>
        <tbody>{[['쉬운말 변환', `1일 ${plan.dailyLimit}회`, '무제한'], ['핵심 요약 · 보도 비교', '가능', '가능'], ['맞춤 추천 · 알림', '가능', '가능']].map(([label, free, paid]) =>
          <tr key={label} className="border-t border-line"><th className="px-3 py-4 text-left font-normal">{label}</th><td className="text-center">{free}</td><td className="text-center font-bold">{paid}</td></tr>)}</tbody>
      </table></div>
      <div className="mt-6 rounded-2xl border border-line bg-surface p-4"><p className="text-sm">구독 요금</p><p className="mt-2 text-2xl font-bold">{plan.demo ? '무료 테스트' : plan.monthlyKrw ? `월 ${plan.monthlyKrw.toLocaleString('ko-KR')}원` : '요금 미정'}</p></div></> :
      <RequestState loading={!error} error={error} onRetry={retry} />}
  </OnboardingLayout>
}
