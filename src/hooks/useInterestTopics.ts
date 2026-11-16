import { useEffect, useState } from 'react'
import { auth } from '../apis/firebase'
import { getProfile, saveProfile } from '../apis/profile'
import { useAuth } from './useAuth'
import { TOPICS } from '../constants/topics'
import type { TopicId } from '../types/onboarding'
import { readInterestPreferences, writeInterestPreferences } from '../utils/interestPreferences'

export function useInterestTopics() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState(readInterestPreferences)
  const [selectedIds, setSelectedIds] = useState<TopicId[]>(preferences.topicIds)
  const [message, setMessage] = useState('')
  const [loadedUid, setLoadedUid] = useState<string>()
  const [saving, setSaving] = useState(false)
  const loading = Boolean(user && loadedUid !== user.uid)
  useEffect(() => {
    if (!user) return
    let active = true
    getProfile().then(value => {
      if (!active) return
      setPreferences(value); setSelectedIds(value.topicIds)
      writeInterestPreferences(value)
    }).catch(() => { if (active) setMessage('저장된 관심 주제를 불러오지 못했어요. 다시 접속해 주세요.') })
      .finally(() => { if (active) setLoadedUid(user.uid) })
    return () => { active = false }
  }, [user])

  const selectedTopics = selectedIds.flatMap((id) => TOPICS.filter((topic) => topic.id === id))
  const availableTopics = TOPICS.filter((topic) => !selectedIds.includes(topic.id))
  const isDirty = selectedIds.length !== preferences.topicIds.length ||
    selectedIds.some((id) => !preferences.topicIds.includes(id))

  function toggleTopic(id: TopicId) {
    if (loading || saving) return
    setMessage('')
    setSelectedIds((current) => current.includes(id)
      ? current.filter((topicId) => topicId !== id)
      : [...current, id])
  }

  async function saveTopics(topicIds = selectedIds) {
    if (loading || saving) return false
    const nextPreferences = { topicIds: [...topicIds], completed: true }
    setSaving(true)
    try {
      if (auth?.currentUser) await saveProfile(nextPreferences)
      else if (!writeInterestPreferences(nextPreferences)) throw new Error('관심 주제를 저장하지 못했어요. 다시 시도해 주세요.')
    } catch (error) { setMessage((error as Error).message); return false }
    finally { setSaving(false) }
    writeInterestPreferences(nextPreferences)

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
    preferences,
    loading,
    saving,
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
