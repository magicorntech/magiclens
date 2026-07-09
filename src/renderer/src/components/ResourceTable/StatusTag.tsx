import { StatusBadge, antColorToVariant, statusTextToVariant } from '../ui/StatusBadge'

interface StatusTagProps {
  text: string
  color: string
  detail?: string
}

export function StatusTag({ text, color, detail }: StatusTagProps): React.JSX.Element {
  const variant = statusTextToVariant(text)
  const resolved = variant === 'default' ? antColorToVariant(color) : variant
  return <StatusBadge label={text} variant={resolved} detail={detail} />
}
