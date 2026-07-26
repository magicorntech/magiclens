import { Avatar } from 'antd'
import { Layers } from 'lucide-react'
import { Icon } from '../ui/Icon'

interface ClusterAvatarProps {
  logoUrl?: string
  name: string
  size?: number
}

/** Squarer corners for denser sidebar lists. */
function softRadius(size: number): number {
  return Math.max(4, Math.min(6, Math.round(size * 0.18)))
}

export function ClusterAvatar({ logoUrl, name, size = 32 }: ClusterAvatarProps): React.JSX.Element {
  const radius = softRadius(size)
  const style: React.CSSProperties = {
    borderRadius: radius,
    flexShrink: 0,
    overflow: 'hidden'
  }

  if (logoUrl) {
    return (
      <Avatar
        src={logoUrl}
        size={size}
        shape="square"
        style={{ ...style, background: 'transparent' }}
      />
    )
  }
  const initial = name.trim().charAt(0).toUpperCase()
  return (
    <Avatar
      size={size}
      shape="square"
      style={{ ...style, backgroundColor: 'var(--ml-primary)' }}
    >
      {initial || <Icon icon={Layers} size={size * 0.45} />}
    </Avatar>
  )
}
