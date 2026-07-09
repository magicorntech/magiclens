import { Avatar } from 'antd'
import { Layers } from 'lucide-react'
import { Icon } from '../ui/Icon'

interface ClusterAvatarProps {
  logoUrl?: string
  name: string
  size?: number
}

export function ClusterAvatar({ logoUrl, name, size = 32 }: ClusterAvatarProps): React.JSX.Element {
  if (logoUrl) {
    return <Avatar src={logoUrl} size={size} shape="square" />
  }
  const initial = name.trim().charAt(0).toUpperCase()
  return (
    <Avatar size={size} shape="square" style={{ backgroundColor: 'var(--ml-primary)' }}>
      {initial || <Icon icon={Layers} size={size * 0.45} />}
    </Avatar>
  )
}
