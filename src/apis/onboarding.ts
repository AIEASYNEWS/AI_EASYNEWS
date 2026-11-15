import type { InterestPreferences, TopicId } from '../types/onboarding'

/** API 명세가 정해지면 구현할 계약. 현재 화면에서는 서버 요청을 보내지 않는다. */
export interface OnboardingApi {
  getInterestPreferences(): Promise<InterestPreferences>
  updateInterestTopics(topicIds: TopicId[]): Promise<InterestPreferences>
}
