import { useState } from 'react'
import { TOPICS } from '../constants/topics'
import type { TopicId } from '../types/onboarding'
import { readInterestPreferences, writeInterestPreferences } from '../utils/interestPreferences'

export function useInterestTopics() {
  const [preferences, setPreferences] = useState(readInterestPreferences)
  const [selectedIds, setSelectedIds] = useState<TopicId[]>(preferences.topicIds)
  const [message, setMessage] = useState('')

  const selectedTopics = selectedIds.flatMap((id) => TOPICS.filter((topic) => topic.id === id))
  const availableTopics = TOPICS.filter((topic) => !selectedIds.includes(topic.id))
  const isDirty = selectedIds.length !== preferences.topicIds.length ||
    selectedIds.some((id) => !preferences.topicIds.includes(id))

  function toggleTopic(id: TopicId) {
    setMessage('')
    setSelectedIds((current) => current.includes(id)
      ? current.filter((topicId) => topicId !== id)
      : [...current, id])
  }

  function saveTopics(topicIds = selectedIds) {
    const nextPreferences = { topicIds: [...topicIds], completed: true }

    if (!writeInterestPreferences(nextPreferences)) {
      setMessage('관심 주제를 저장하지 못했어요. 브라우저 저장 공간을 확인하고 다시 시도해 주세요.')
      return false
    }

    setPreferences(nextPreferences)
    setSelectedIds(nextPreferences.topicIds)
    setMessage(topicIds.length > 0 ? '관심 주제를 저장했어요.' : '관심 주제 없이 계속할 수 있어요.')
    return true
  }

  function discardChanges() {
    setSelectedIds(preferences.topicIds)
    setMessage('')
  }

  return {
    selectedIds,
    selectedTopics,
    availableTopics,
    isDirty,
    message,
    toggleTopic,
    saveTopics,
    discardChanges,
  }
}
