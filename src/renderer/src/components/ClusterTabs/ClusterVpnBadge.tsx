import { Tag, Tooltip } from 'antd'
import { Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import { useClusterVpnStore } from '../../stores/clusterVpnStore'
import { useVpnStore } from '../../stores/vpnStore'

interface ClusterVpnBadgeProps {
  clusterId: string
  /** Sidebar / tight rows — icon-only with tooltip */
  compact?: boolean
}

export function ClusterVpnBadge({ clusterId, compact }: ClusterVpnBadgeProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const vpnProfileId = useClusterVpnStore((s) => s.links[clusterId])
  const profiles = useVpnStore((s) => s.profiles)
  const status = useVpnStore((s) => s.status)

  if (!vpnProfileId) return null

  const profile = profiles.find((p) => p.id === vpnProfileId)
  const isActive =
    (status?.connectedProfileIds?.includes(vpnProfileId) ?? false) ||
    (status?.activeProfileId === vpnProfileId && status.status === 'connected')
  const isConnecting = status?.activeProfileId === vpnProfileId && status.status === 'connecting'

  if (!profile) {
    return (
      <Tooltip title={t('vpn.badge.missingTooltip')}>
        <Tag color="warning" icon={<Icon icon={Shield} variant="micro" />} style={compact ? compactTagStyle : undefined}>
          {compact ? null : t('vpn.badge.missing')}
        </Tag>
      </Tooltip>
    )
  }

  const color = isActive ? 'success' : isConnecting ? 'processing' : 'purple'
  const tooltip = isActive
    ? t('vpn.badge.connected', { name: profile.name })
    : isConnecting
      ? t('vpn.badge.connecting', { name: profile.name })
      : t('vpn.badge.autoConnect', { name: profile.name })

  if (compact) {
    return (
      <Tooltip title={tooltip}>
        <Tag color={color} style={compactTagStyle}>
          <Icon icon={Shield} variant="micro" />
        </Tag>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={tooltip}>
      <Tag
        color={color}
        icon={<Icon icon={Shield} variant="micro" />}
        style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}
      >
        {profile.name}
      </Tag>
    </Tooltip>
  )
}

const compactTagStyle: React.CSSProperties = {
  fontSize: 10,
  lineHeight: '14px',
  padding: '0 4px',
  margin: 0,
  display: 'inline-flex',
  alignItems: 'center'
}
