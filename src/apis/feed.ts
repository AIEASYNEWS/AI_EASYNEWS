import { apiRequest } from './client'
import type { ChatArticle, ChatMessage, ChatRoom, FeedDetail, FeedResponse, SimilarArticle } from '../types/news'

export const getFeed = (signal?: AbortSignal) => apiRequest<FeedResponse>('/feed', { signal })
export const getFeedDetail = (id: string, signal?: AbortSignal) => apiRequest<FeedDetail>(`/feed/${encodeURIComponent(id)}`, { signal })
export const getSimilar = (id: string, signal?: AbortSignal) => apiRequest<SimilarArticle[]>(`/feed/${encodeURIComponent(id)}/similar`, { signal })
export const getReason = (id: string, signal?: AbortSignal) => apiRequest<{ reason: string }>(`/feed/${encodeURIComponent(id)}/reason`, { method: 'POST', signal })
export const sendFeedback = (id: string, value: 'good' | 'bad') => apiRequest<{ value: string }>(`/feed/${encodeURIComponent(id)}/feedback`, { method: 'PUT', body: JSON.stringify({ value }) })
export const setBookmark = (id: string, saved: boolean) => apiRequest<{ bookmarked: boolean }>(`/feed/${encodeURIComponent(id)}/bookmark`, { method: 'PUT', body: JSON.stringify({ saved }) })

export const getChatRooms = (signal?: AbortSignal) => apiRequest<ChatRoom[]>('/chats', { signal })
export const getChatRoom = (id: string, signal?: AbortSignal) => apiRequest<{ article: ChatArticle; room: ChatRoom | null; messages: ChatMessage[] }>(`/chats/${encodeURIComponent(id)}`, { signal })
export const sendChatMessage = (id: string, message: { text: string; quote?: string }, signal?: AbortSignal) =>
  apiRequest<{ created: boolean; messages: ChatMessage[] }>(`/chats/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify(message), signal })
export const deleteChatRoom = (id: string) => apiRequest<{ deleted: boolean }>(`/chats/${encodeURIComponent(id)}`, { method: 'DELETE' })
