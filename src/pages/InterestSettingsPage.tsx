import { useState } from 'react'
import { DiscardChangesDialog } from '../components/onboarding/DiscardChangesDialog'
import { OnboardingLayout } from '../components/onboarding/OnboardingLayout'
import { TopicChip } from '../components/onboarding/TopicChip'
import { Button } from '../components/ui/Button'
import { StatusMessage } from '../components/ui/StatusMessage'
import { useInterestTopics } from '../hooks/useInterestTopics'

export function InterestSettingsPage({ onBack }: { onBack: () => void }) {
  const { selectedTopics, availableTopics, toggleTopic, isDirty, saveTopics, discardChanges, message, loading, saving } = useInterestTopics()
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  function requestBack() {
    if (isDirty) setShowDiscardDialog(true)
    else onBack()
  }

  return (
    <>
      <OnboardingLayout
        pageTitle="관심 주제 설정"
        title="관심 주제 설정"
        action={{ label: '뒤로 가기', icon: 'back', onClick: requestBack }}
        footer={<Button disabled={loading || saving} onClick={() => saveTopics()}>{saving ? '저장 중' : loading ? '불러오는 중' : '저장하기'}</Button>}
      >
        <section aria-labelledby="my-topics-heading">
          <h2 id="my-topics-heading" className="text-lg leading-[26px] font-bold">내 관심 주제</h2>
          <p className="mt-2 text-sm leading-[21px] text-muted">× 를 누르면 목록에서 빠져요.</p>
          <div role="group" aria-label="내 관심 주제" className="mt-4 flex flex-wrap gap-2">
            {selectedTopics.length > 0 ? selectedTopics.map((topic) => (
              <TopicChip key={topic.id} topic={topic} selected mode="remove" onClick={() => toggleTopic(topic.id)} />
            )) : <p className="text-sm leading-[22px] text-muted">아래에서 관심 주제를 추가해 주세요.</p>}
          </div>
        </section>
        <section aria-labelledby="available-topics-heading" className="mt-8">
          <h2 id="available-topics-heading" className="text-lg leading-[26px] font-bold">추가할 수 있는 주제</h2>
          <p className="mt-2 text-sm leading-[21px] text-muted">+ 를 누르면 내 관심 주제에 들어가요.</p>
          <div role="group" aria-label="추가할 수 있는 주제" className="mt-4 flex flex-wrap gap-2">
            {availableTopics.length > 0 ? availableTopics.map((topic) => (
              <TopicChip key={topic.id} topic={topic} mode="add" onClick={() => toggleTopic(topic.id)} />
            )) : <p className="text-sm leading-[22px] text-muted">모든 주제를 추가했어요.</p>}
          </div>
        </section>
        <div className="-mx-5 mt-4"><StatusMessage>{message}</StatusMessage></div>
      </OnboardingLayout>
      <DiscardChangesDialog
        open={showDiscardDialog}
        onKeepEditing={() => setShowDiscardDialog(false)}
        onDiscard={() => {
          discardChanges()
          setShowDiscardDialog(false)
          onBack()
        }}
      />
    </>
  )
}
