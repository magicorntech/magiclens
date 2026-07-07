import { Tag, Tooltip } from 'antd'

interface StatusTagProps {
  text: string
  color: string
  detail?: string
}

export function StatusTag({ text, color, detail }: StatusTagProps): React.JSX.Element {
  const tag = <Tag color={color}>{text}</Tag>
  if (!detail) return tag
  return <Tooltip title={detail}>{tag}</Tooltip>
}
