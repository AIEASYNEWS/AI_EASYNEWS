import { Icon } from '../ui/Icon'

interface FeatureItemProps {
  icon: 'tag' | 'bell'
  title: string
  description: string
}

export function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5]">
        <Icon name={icon} />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-base leading-6 font-bold">{title}</h2>
        <p className="text-sm leading-[21px] font-normal break-keep text-[#777777]">{description}</p>
      </div>
    </li>
  )
}
