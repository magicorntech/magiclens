import { Badge, Tooltip, Typography } from 'antd'
import type { ConnectionStatus } from '@shared/types/cluster'

const statusConfig: Record<ConnectionStatus, { status: 'success' | 'processing' | 'error' | 'default'; label: string }> = {
  idle: { status: 'default', label: 'Idle' },
  connecting: { status: 'processing', label: 'Connecting…' },
  connected: { status: 'success', label: 'Connected' },
  error: { status: 'error', label: 'Connection error' }
}

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus
  errorMessage?: string
  /** Smaller dot + label for tight spaces like the sidebar favorites list. */
  compact?: boolean
  /** Text color override — the default badge text color is too dark on the sidebar's navy background. */
  textColor?: string
}

export function ConnectionStatusBadge({
  status,
  errorMessage,
  compact,
  textColor
}: ConnectionStatusBadgeProps): React.JSX.Element {
  const config = statusConfig[status]
  const title = status === 'error' && errorMessage ? errorMessage : config.label

  if (compact) {
    return (
      <Tooltip title={title}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <Badge status={config.status} />
          <Typography.Text
            style={{ fontSize: 11, lineHeight: '14px', color: textColor ?? 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}
          >
            {config.label}
          </Typography.Text>
        </span>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={title}>
      <Badge status={config.status} text={config.label} />
    </Tooltip>
  )
}
