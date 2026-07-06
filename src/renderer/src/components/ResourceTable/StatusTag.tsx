import { Tag } from 'antd'

interface StatusTagProps {
  text: string
  color: string
}

export function StatusTag({ text, color }: StatusTagProps): React.JSX.Element {
  return <Tag color={color}>{text}</Tag>
}
