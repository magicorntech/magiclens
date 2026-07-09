import { Tooltip } from 'antd'

export type StatusBadgeVariant =
  | 'running'
  | 'pending'
  | 'failed'
  | 'unknown'
  | 'warning'
  | 'crashloop'
  | 'imagepull'
  | 'info'
  | 'default'

const VARIANT_STYLES: Record<StatusBadgeVariant, { bg: string; fg: string; dot: string }> = {
  running: { bg: 'var(--ml-status-success-bg)', fg: 'var(--ml-status-success-fg)', dot: 'var(--ml-success)' },
  pending: { bg: 'var(--ml-status-warning-bg)', fg: 'var(--ml-status-warning-fg)', dot: 'var(--ml-warning)' },
  failed: { bg: 'var(--ml-status-danger-bg)', fg: 'var(--ml-status-danger-fg)', dot: 'var(--ml-error)' },
  unknown: { bg: 'var(--ml-status-neutral-bg)', fg: 'var(--ml-status-neutral-fg)', dot: 'var(--ml-text-tertiary)' },
  warning: { bg: 'var(--ml-status-warning-bg)', fg: 'var(--ml-status-warning-fg)', dot: 'var(--ml-warning)' },
  crashloop: { bg: 'var(--ml-status-orange-bg)', fg: 'var(--ml-status-orange-fg)', dot: '#f97316' },
  imagepull: { bg: 'var(--ml-status-danger-bg)', fg: 'var(--ml-status-danger-fg)', dot: 'var(--ml-error)' },
  info: { bg: 'var(--ml-status-info-bg)', fg: 'var(--ml-status-info-fg)', dot: 'var(--ml-info)' },
  default: { bg: 'var(--ml-status-neutral-bg)', fg: 'var(--ml-status-neutral-fg)', dot: 'var(--ml-text-tertiary)' }
}

export function statusTextToVariant(text: string): StatusBadgeVariant {
  const t = text.toLowerCase()
  if (t.includes('running') || t === 'ready' || t === 'active' || t === 'deployed' || t === 'bound' || t === 'succeeded') {
    return 'running'
  }
  if (t.includes('pending') || t.includes('progress') || t.includes('waiting') || t === 'pending') return 'pending'
  if (t.includes('crashloop')) return 'crashloop'
  if (t.includes('imagepull') || t.includes('errimagepull')) return 'imagepull'
  if (t.includes('fail') || t.includes('error') || t === 'notready' || t === 'lost' || t === 'uninstalled') return 'failed'
  if (t.includes('warn') || t === 'unknown' || t === 'terminating') return 'warning'
  return 'default'
}

export function antColorToVariant(color: string): StatusBadgeVariant {
  switch (color) {
    case 'green':
    case 'success':
      return 'running'
    case 'gold':
    case 'orange':
    case 'warning':
      return 'pending'
    case 'red':
    case 'error':
      return 'failed'
    case 'blue':
    case 'processing':
      return 'info'
    default:
      return 'default'
  }
}

interface StatusBadgeProps {
  label: string
  variant?: StatusBadgeVariant
  detail?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ label, variant = 'default', detail, size = 'sm' }: StatusBadgeProps): React.JSX.Element {
  const style = VARIANT_STYLES[variant]
  const badge = (
    <span
      className={`ml-status-badge ml-status-badge--${size}`}
      style={{ background: style.bg, color: style.fg }}
    >
      <span className="ml-status-badge-dot" style={{ background: style.dot }} />
      {label}
    </span>
  )
  if (!detail) return badge
  return <Tooltip title={detail}>{badge}</Tooltip>
}
