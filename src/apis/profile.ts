import { apiRequest } from './client'
import type { InterestPreferences } from '../types/onboarding'

export const getProfile = () => apiRequest<InterestPreferences>('/profile')
export const saveProfile = (profile: InterestPreferences) => apiRequest<InterestPreferences>('/profile', { method: 'PUT', body: JSON.stringify(profile) })
