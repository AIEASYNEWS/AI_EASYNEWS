import type { AgeGroup, Gender, Occupation, Topic, TopicId } from '../types/onboarding'

export const TOPICS: readonly Topic[] = [
  { id: 'jobs', label: '취업' },
  { id: 'economy', label: '경제' },
  { id: 'politics', label: '정치' },
  { id: 'society', label: '사회' },
  { id: 'technology', label: 'IT·과학' },
  { id: 'youth', label: '청년정책' },
  { id: 'health', label: '건강' },
  { id: 'culture', label: '문화' },
  { id: 'lifestyle', label: '생활' },
]
export const topicLabel = (id: TopicId | string) => TOPICS.find(topic => topic.id === id)?.label ?? id

export const AGE_GROUPS: readonly { id: AgeGroup; label: string }[] = [
  { id: 'teens', label: '10대' }, { id: 'early20s', label: '20대 초반' }, { id: 'late20s', label: '20대 후반' },
  { id: 'thirties', label: '30대' }, { id: 'forties', label: '40대' }, { id: 'fiftyPlus', label: '50대 이상' },
]
export const GENDERS: readonly { id: Gender; label: string }[] = [
  { id: 'female', label: '여성' }, { id: 'male', label: '남성' }, { id: 'none', label: '선택 안 함' },
]
export const OCCUPATIONS: readonly { id: Occupation; label: string }[] = [
  { id: 'secondary', label: '중·고등학생' }, { id: 'university', label: '대학생' }, { id: 'jobseeker', label: '취업 준비생' },
  { id: 'employee', label: '직장인' }, { id: 'selfEmployed', label: '자영업' }, { id: 'freelancer', label: '프리랜서' }, { id: 'other', label: '기타' },
]
export const MAX_CUSTOM_KEYWORDS = 10
export const ID_PATTERN = /^[a-z0-9]{4,16}$/
export const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,10}$/
export const strongPassword = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
