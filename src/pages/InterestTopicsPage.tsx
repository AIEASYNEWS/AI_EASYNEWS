import { OnboardingLayout } from '../components/onboarding/OnboardingLayout'
import { TopicChip } from '../components/onboarding/TopicChip'
import { Button } from '../components/ui/Button'
import { StatusMessage } from '../components/ui/StatusMessage'
import { TOPICS } from '../constants/topics'
import { useInterestTopics } from '../hooks/useInterestTopics'
import type { InterestPreferences } from '../types/onboarding'

interface InterestTopicsPageProps {
  onComplete?: (preferences: InterestPreferences) => void
}

export function InterestTopicsPage({ onComplete }: InterestTopicsPageProps) {
  const { selectedIds, toggleTopic, saveTopics, message } = useInterestTopics()

  function complete(skip = false) {
    const topicIds = skip ? [] : selectedIds
    if (saveTopics(topicIds)) {
      // 홈 화면을 연결할 때 onComplete에서 이동한다. 현재는 온보딩 화면만 제공한다.
      onComplete?.({ topicIds, completed: true })
    }
  }

  return (
    <OnboardingLayout
      pageTitle="관심 주제 선택"
      footer={
        <div className="flex flex-col gap-2">
          <p aria-live="polite" aria-atomic="true" className="text-center text-sm leading-5 font-medium text-[#333333]">
            {selectedIds.length > 0 ? `${selectedIds.length}개 선택했어요` : '관심 주제를 골라 주세요'}
          </p>
          <Button disabled={selectedIds.length === 0} onClick={() => complete()}>선택 완료</Button>
          <Button variant="text" onClick={() => complete(true)}>나중에 하기</Button>
        </div>
      }
    >
      <section aria-labelledby="topics-heading">
        <h1 id="topics-heading" className="text-2xl leading-8 font-bold break-keep">어떤 뉴스가 궁금하세요?</h1>
        <p className="mt-2 text-sm leading-[21px] break-keep text-[#777777]">관심 주제를 여러 개 고를 수 있어요. 나중에 마이페이지에서 바꿀 수 있어요.</p>
        <div role="group" aria-label="관심 주제" className="mt-8 flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <TopicChip key={topic.id} topic={topic} selected={selectedIds.includes(topic.id)} onClick={() => toggleTopic(topic.id)} />
          ))}
        </div>
      </section>
      <div className="-mx-5 mt-4"><StatusMessage>{message}</StatusMessage></div>
    </OnboardingLayout>
  )
}
