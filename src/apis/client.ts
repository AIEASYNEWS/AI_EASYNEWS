import { getIdToken } from './firebase'

export class ApiError extends Error {
  code: string
  constructor(message: string, code = 'REQUEST_FAILED') { super(message); this.code = code }
}
export async function apiRequest<T>(path: string, options: RequestInit & { authenticated?: boolean } = {}): Promise<T> {
  const { authenticated = true, ...init } = options
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (authenticated) headers.set('Authorization', `Bearer ${await getIdToken()}`)
  let response: Response
  try { response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api${path}`, { ...init, headers }) }
  catch (error) { if (init.signal?.aborted) throw error; throw new ApiError('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.') }
  const body = await response.json().catch(() => null)
  if (!response.ok || !body) throw new ApiError(body?.message || '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.', body?.code)
  return body as T
}
