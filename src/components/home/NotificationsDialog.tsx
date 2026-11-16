import { useEffect, useState } from 'react'
import { apiRequest } from '../../apis/client'
import type { NewsItem } from '../../types/news'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { NewsListItem } from '../explore/NewsListItem'
import { RequestState } from '../ui/RequestState'

type Notification = NewsItem & { read: boolean }
export function NotificationsDialog({ onClose, onArticle }: { onClose: () => void; onArticle: (article: NewsItem) => void }) {
  const [items, setItems] = useState<Notification[]>()
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    apiRequest<Notification[]>('/notifications', { signal: controller.signal }).then(setItems).catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [version])
  async function open(item: Notification) {
    try { await apiRequest(`/notifications/${item.id}/read`, { method: 'POST' }) } catch { /* 기사 열기는 계속할 수 있다. */ }
    onClose(); onArticle(item)
  }
  return <Dialog open labelledBy="notifications-heading" onClose={onClose} sheet><h2 id="notifications-heading" className="text-lg leading-[26px] font-bold">관심 뉴스 알림</h2><p className="mt-2 text-xs leading-[18px] text-[#777777]">최근 수집된 관심 주제 뉴스를 확인해 보세요.</p><div className="mt-6">{error ? <RequestState error={error} onRetry={() => { setError(''); setVersion(value => value + 1) }} /> : !items ? <RequestState loading /> : items.length ? items.map(item => <div key={item.id} className={item.read ? 'opacity-60' : ''}><NewsListItem article={item} onClick={() => void open(item)} /></div>) : <RequestState empty="아직 새로운 관심 뉴스가 없어요. 마이에서 관심 주제를 설정해 보세요." />}</div><Button variant="secondary" className="mt-4" onClick={onClose}>닫기</Button></Dialog>
}
