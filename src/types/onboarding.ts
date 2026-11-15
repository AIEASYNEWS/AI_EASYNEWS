export type TopicId = 'economy' | 'politics' | 'society' | 'technology' | 'health' | 'culture'

export interface Topic {
  id: TopicId
  label: string
}

export interface InterestPreferences {
  topicIds: TopicId[]
  completed: boolean
}

export type OnboardingRoute = 'welcome' | 'topics' | 'interests'
