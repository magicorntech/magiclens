import { Badge, Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ConnectionStatus } from '@shared/types/cluster'

const statusBadge: Record<ConnectionStatus, 'success' | 'processing' | 'error' | 'default'> = {
  idle: 'default',
  disconnected: 'default',
  connecting: 'processing',
  connected: 'success',
  error: 'error'
}

const statusKeys: Record<ConnectionStatus, string> = {
  idle: 'common.idle',
  disconnected: 'common.disconnected',
  connecting: 'common.connecting',
  connected: 'common.connected',
  error: 'common.connectionError'
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
  const { t } = useTranslation()
  const label = t(statusKeys[status])
  const badgeStatus = statusBadge[status]
  const title = status === 'error' && errorMessage ? errorMessage : label

  if (compact) {
    return (
      <Tooltip title={title}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <Badge status={badgeStatus} />
          <Typography.Text
            style={{ fontSize: 11, lineHeight: '14px', color: textColor ?? 'var(--ml-sidebar-muted)', whiteSpace: 'nowrap' }}
          >
            {label}
          </Typography.Text>
        </span>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={title}>
      <Badge status={badgeStatus} text={label} />
    </Tooltip>
  )
}
