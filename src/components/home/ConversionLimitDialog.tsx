import type { ViewerMode } from '../../types/news'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

interface ConversionLimitDialogProps {
  open: boolean
  viewer: ViewerMode
  onClose: () => void
  onLogin: () => void
  onSubscribe: () => void
  onSignUp: () => void
}

export function ConversionLimitDialog({ open, viewer, onClose, onLogin, onSignUp, onSubscribe }: ConversionLimitDialogProps) {
  const guest = viewer === 'guest'
  return (
    <Dialog open={open} labelledBy="limit-title" onClose={onClose}>
      <h2 id="limit-title" className="text-center text-xl leading-7 font-bold break-keep">오늘 변환을 모두 사용했어요</h2>
      <p className="mt-2 text-center text-sm leading-[21px] text-muted">매일 자정에 변환 횟수가 초기화돼요.</p>
      <div className="mt-6 rounded-xl bg-surface p-4">
        <p className="text-sm leading-[21px] font-bold">{guest ? '로그인하면' : '구독하면'}</p>
        <p className="mt-2 text-sm leading-[21px] text-muted">{guest ? '맞춤 뉴스와 변환한 기사를 이어서 볼 수 있어요.' : '횟수 제한 없이 쉬운말로 변환할 수 있어요.'}</p>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={guest ? onLogin : onSubscribe}>{guest ? '로그인하기' : '구독하기'}</Button>
        {guest && <Button variant="secondary" onClick={onSignUp}>회원가입하기</Button>}
        <Button variant="text" onClick={onClose}>나중에 하기</Button>
      </div>
    </Dialog>
  )
}
