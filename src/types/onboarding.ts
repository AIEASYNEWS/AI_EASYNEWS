export type TopicId = 'jobs' | 'economy' | 'politics' | 'society' | 'technology' | 'youth' | 'health' | 'culture' | 'lifestyle'
export type AgeGroup = 'teens' | 'early20s' | 'late20s' | 'thirties' | 'forties' | 'fiftyPlus'
export type Gender = 'female' | 'male' | 'none'
export type Occupation = 'secondary' | 'university' | 'jobseeker' | 'employee' | 'selfEmployed' | 'freelancer' | 'other'

export interface Topic {
  id: TopicId
  label: string
}

export interface InterestPreferences {
  topicIds: TopicId[]
  completed: boolean
}

export interface UserProfile extends InterestPreferences {
  customKeywords: string[]
  ageGroup?: AgeGroup
  gender?: Gender
  occupation?: Occupation
  occupationOther?: string
  region?: { sido: string; sigungu: string }
  nickname?: string
  privacyConsent?: boolean
}
