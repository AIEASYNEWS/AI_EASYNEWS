type IconName = 'tag' | 'bell' | 'close' | 'back' | 'check' | 'plus' | 'remove'

const sizes: Record<IconName, number> = {
  tag: 24,
  bell: 24,
  close: 24,
  back: 24,
  check: 16,
  plus: 16,
  remove: 16,
}

export function Icon({ name }: { name: IconName }) {
  const size = sizes[name]

  return (
    <img
      src={`/images/onboarding/${name}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="shrink-0"
    />
  )
}
