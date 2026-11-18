import { apiRequest } from './client'
import type { NewsItem } from '../types/news'
import type { TopicId } from '../types/onboarding'

export interface NotificationSettings { enabled: boolean; topicIds: TopicId[] }
export interface Subscription { active: boolean; dailyLimit: number; monthlyKrw: number | null; checkoutUrl: string | null; managementUrl: string | null; demo?: boolean }
export type NewsNotification = NewsItem & { read: boolean }

export const getNotifications = (signal: AbortSignal) => apiRequest<NewsNotification[]>('/notifications', { signal })
export const getNotificationSettings = (signal: AbortSignal) => apiRequest<NotificationSettings>('/notification-settings', { signal })
export const getSubscription = (signal: AbortSignal) => apiRequest<Subscription>('/subscription', { signal })
export const activateDemoSubscription = () => apiRequest<Subscription>('/subscription/demo', { method: 'POST' })
export const markRead = (id: string) => apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
export const setNotifications = (enabled: boolean) => apiRequest<{ enabled: boolean }>('/notification-settings', { method: 'PUT', body: JSON.stringify({ enabled }) })
