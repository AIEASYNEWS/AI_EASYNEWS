import type { AgeGroup, Gender, Occupation, TopicId } from '../types/onboarding'

export interface ProfileDraft {
  ageGroup?: AgeGroup
  gender?: Gender
  occupation?: Occupation
  occupationOther: string
  privacyConsent: boolean
  topicIds: TopicId[]
  customKeywords: string[]
  nickname: string
}
export const emptyDraft: ProfileDraft = { occupationOther: '', privacyConsent: false, topicIds: [], customKeywords: [], nickname: '' }

export function infoComplete(draft: ProfileDraft) {
  return Boolean(draft.ageGroup && draft.gender && draft.occupation && (draft.occupation !== 'other' || draft.occupationOther.trim()) && draft.privacyConsent)
}

