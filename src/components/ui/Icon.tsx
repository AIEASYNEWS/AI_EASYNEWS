type IconName = 'tag' | 'bell' | 'close' | 'back' | 'check' | 'plus' | 'remove'
  | 'home' | 'explore' | 'profile' | 'notification' | 'lock' | 'alert'
  | 'chevron-down' | 'sparkles' | 'sparkles-light' | 'send' | 'complete'

const sizes: Record<IconName, number> = {
  tag: 24,
  bell: 24,
  close: 24,
  back: 24,
  check: 16,
  plus: 16,
  remove: 16,
  home: 24,
  explore: 24,
  profile: 24,
  notification: 24,
  lock: 32,
  alert: 24,
  'chevron-down': 14,
  sparkles: 20,
  'sparkles-light': 16,
  send: 20,
  complete: 16,
}

const onboardingIcons = new Set<IconName>(['tag', 'bell', 'close', 'back', 'check', 'plus', 'remove'])

export function Icon({ name }: { name: IconName }) {
  const size = sizes[name]

  return (
    <img
      src={`/images/${onboardingIcons.has(name) ? 'onboarding' : 'home'}/${name}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="shrink-0"
    />
  )
}
