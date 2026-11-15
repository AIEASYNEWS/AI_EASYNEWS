import { TOPICS } from '../constants/topics'
import type { InterestPreferences, TopicId } from '../types/onboarding'

const STORAGE_KEY = 'easynews.interest-preferences.v1'

const isTopicId = (value: unknown): value is TopicId =>
  TOPICS.some((topic) => topic.id === value)

export function readInterestPreferences(): InterestPreferences {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')

    if (raw && typeof raw === 'object' && 'topicIds' in raw && Array.isArray(raw.topicIds)) {
      return {
        topicIds: [...new Set(raw.topicIds.filter(isTopicId))],
        completed: 'completed' in raw && raw.completed === true,
      }
    }
  } catch {
    // 저장소 접근이 제한되거나 이전 데이터가 잘못된 경우에도 화면은 사용할 수 있다.
  }

  return { topicIds: [], completed: false }
}

export function writeInterestPreferences(preferences: InterestPreferences): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    return true
  } catch {
    return false
  }
}
