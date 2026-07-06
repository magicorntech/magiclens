import { Avatar } from 'antd'
import { ClusterOutlined } from '@ant-design/icons'

interface ClusterAvatarProps {
  logoUrl?: string
  name: string
  size?: number
}

export function ClusterAvatar({ logoUrl, name, size = 32 }: ClusterAvatarProps): React.JSX.Element {
  if (logoUrl) {
    return <Avatar src={logoUrl} size={size} shape="square" />
  }
  const initial = name.trim().charAt(0).toUpperCase() || <ClusterOutlined />
  return (
    <Avatar size={size} shape="square" style={{ backgroundColor: '#1677ff' }}>
      {initial}
    </Avatar>
  )
}
