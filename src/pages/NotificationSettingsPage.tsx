import { useState } from 'react'
import { getNotificationSettings, setNotifications } from '../apis/account'
import { deviceRegistered, enableDevice, pushConfigured } from '../apis/push'
import { PageLayout } from '../components/layout/PageLayout'
import { SettingsRow, TopicBadges } from '../components/layout/SettingsRow'
import { RequestState } from '../components/ui/RequestState'
import { useAccountResource } from '../hooks/useAccountResource'

export function NotificationSettingsPage({ onBack, onTopics }: { onBack: () => void; onTopics: () => void }) {
  const { value, error, retry } = useAccountResource(getNotificationSettings)
  const [saved, setSaved] = useState<boolean>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const enabled = saved ?? value?.enabled
  async function change(changeDevice = false) {
    setBusy(true); setMessage('')
    try {
      if (changeDevice) { await enableDevice(); setMessage('이 기기로 새 기사 알림을 보내 드려요.') }
      else setSaved((await setNotifications(!enabled)).enabled)
    } catch (cause) { setMessage((cause as Error).message) }
    finally { setBusy(false) }
  }
  return <PageLayout title="알림 설정" onBack={onBack} contentClassName="px-5 pt-2 pb-6">
    {!value ? <RequestState loading={!error} error={error} onRetry={retry} /> : <>
      <div className="flex items-center justify-between gap-4 border-b border-line py-4"><div>
        <h2 id="notification-switch" className="font-semibold">관심 주제 알림</h2>
        <p className="mt-2 text-sm text-muted">관심 주제의 새 기사가 나오면 알림 목록에서 알려 드려요.</p></div>
        <button type="button" role="switch" aria-labelledby="notification-switch" aria-checked={Boolean(enabled)} disabled={busy} onClick={() => void change()} className={`flex h-8 w-[52px] shrink-0 items-center rounded-full p-1 ${enabled ? 'justify-end bg-brand' : 'bg-slate-300'}`}><span className="size-6 rounded-full bg-white" /></button>
      </div>
      {enabled && pushConfigured && !deviceRegistered() && <button disabled={busy} className="mt-3 text-sm font-bold text-brand" onClick={() => void change(true)}>이 기기에서도 알림 받기</button>}
      {message && <p role="status" className="mt-2 text-sm text-secondary">{message}</p>}
      <h2 className="mt-8 text-lg font-bold">알림 받을 관심 주제</h2><p className="mt-2 text-sm text-muted">{enabled ? '아래 주제의 새 기사가 나오면 알려 드려요.' : '알림을 켜면 아래 주제의 새 기사를 알려 드려요.'}</p>
      <TopicBadges ids={value.topicIds} /><div className="mt-8"><SettingsRow title="관심 주제 설정" detail="알림 받을 주제를 바꿀 수 있어요." onClick={onTopics} /></div>
    </>}
  </PageLayout>
}
