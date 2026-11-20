import { apiRequest } from './client'
import type { UserProfile } from '../types/onboarding'

export const getProfile = (signal?: AbortSignal) => apiRequest<UserProfile>('/profile', { signal })
export const saveProfile = (profile: Partial<UserProfile>) => apiRequest<UserProfile>('/profile', { method: 'PUT', body: JSON.stringify(profile) })
export const checkUsername = (id: string) => apiRequest<{ available: boolean }>(`/auth/username?id=${encodeURIComponent(id)}`, { authenticated: false })
export const checkNickname = (name: string) => apiRequest<{ available: boolean }>(`/auth/nickname?name=${encodeURIComponent(name)}`, { authenticated: false })
