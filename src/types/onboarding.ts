export type TopicId = 'economy' | 'politics' | 'society' | 'technology' | 'health' | 'culture' | 'lifestyle'

export interface Topic {
  id: TopicId
  label: string
}

export interface InterestPreferences {
  topicIds: TopicId[]
  completed: boolean
}
