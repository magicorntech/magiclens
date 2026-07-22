import { useMemo } from 'react'
import { Card, Col, Progress, Row, Space, Tag, Typography } from 'antd'
import { CheckCircle2, Circle, Laptop, Router, Server, Shield } from 'lucide-react'
import type { VpnProfileSummary, VpnRuntimeStatus } from '@shared/types/vpn'
import { formatBitrate, formatByteSize } from '@shared/types/vpn'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../components/ui/Icon'

const MAX_BAR_BPS = 10 * 1024 * 1024

function barPercent(bps: number): number {
  if (bps <= 0) return 0
  return Math.min(100, Math.round((bps / MAX_BAR_BPS) * 100))
}

function StepNode({
  icon,
  label,
  sub,
  ok,
  active
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  ok?: boolean
  active?: boolean
}): React.JSX.Element {
  return (
    <div className={`ml-vpn-node${active ? ' ml-vpn-node--active' : ''}${ok ? ' ml-vpn-node--ok' : ''}`}>
      <div className="ml-vpn-node__icon">{icon}</div>
      <Typography.Text strong className="ml-vpn-node__label">
        {label}
      </Typography.Text>
      {sub ? (
        <Typography.Text type="secondary" className="ml-vpn-node__sub">
          {sub}
        </Typography.Text>
      ) : null}
    </div>
  )
}

export function VpnConnectionPanel({
  status,
  activeProfile
}: {
  status: VpnRuntimeStatus | null
  activeProfile?: VpnProfileSummary
}): React.JSX.Element {
  const { t } = useTranslation()
  const connected = status?.status === 'connected'
  const connecting = status?.status === 'connecting'
  const stats = status?.stats
  const rxRate = stats?.rxRateBps ?? 0
  const txRate = stats?.txRateBps ?? 0

  const uptime = useMemo(() => {
    if (!status?.connectedAt) return null
    const ms = Date.now() - new Date(status.connectedAt).getTime()
    const sec = Math.floor(ms / 1000)
    const min = Math.floor(sec / 60)
    const hr = Math.floor(min / 60)
    if (hr > 0) return `${hr}h ${min % 60}m`
    if (min > 0) return `${min}m ${sec % 60}s`
    return `${sec}s`
  }, [status?.connectedAt, stats?.updatedAt])

  const checks = [
    {
      key: 'process',
      label: t('vpn.panel.checkProcess'),
      ok: connected || connecting
    },
    {
      key: 'interface',
      label: t('vpn.panel.checkInterface'),
      ok: connected && !!stats?.interfaceName
    },
    {
      key: 'traffic',
      label: t('vpn.panel.checkTraffic'),
      ok: connected && (rxRate > 0 || txRate > 0 || (stats?.rxBytes ?? 0) > 0)
    }
  ]

  const allOk = connected && checks.every((c) => c.ok)
  const falsePositive = connected && !stats?.interfaceName ? t('vpn.panel.falsePositive') : null

  return (
    <Card
      size="small"
      className="ml-vpn-connection-panel"
      title={
        <Space>
          <span>{t('vpn.panel.connectionStatus')}</span>
          {connected ? (
            <Tag color={allOk ? 'success' : 'warning'}>
              {allOk ? t('vpn.panel.healthyTunnel') : t('vpn.panel.verifying')}
            </Tag>
          ) : connecting ? (
            <Tag color="processing">{t('vpn.panel.connecting')}</Tag>
          ) : status?.status === 'error' ? (
            <Tag color="error">{t('vpn.panel.error')}</Tag>
          ) : (
            <Tag>{t('vpn.panel.disconnected')}</Tag>
          )}
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <div className="ml-vpn-topology">
        <StepNode
          icon={<Icon icon={Laptop} variant="detail" />}
          label="MagicLens"
          sub={activeProfile?.username || t('vpn.panel.local')}
          ok={connected}
          active={connected}
        />
        <div className={`ml-vpn-link${connected ? ' ml-vpn-link--live' : ''}`}>
          <span className="ml-vpn-link__arrow">→</span>
          {connected && (
            <span className="ml-vpn-link__rate">
              ↑ {formatBitrate(txRate)} · ↓ {formatBitrate(rxRate)}
            </span>
          )}
        </div>
        <StepNode
          icon={<Icon icon={Shield} variant="detail" />}
          label={t('vpn.panel.tunnel')}
          sub={stats?.interfaceName ?? (connecting ? t('vpn.panel.opening') : '—')}
          ok={connected && !!stats?.interfaceName}
          active={connected}
        />
        <div className={`ml-vpn-link${connected ? ' ml-vpn-link--live' : ''}`}>
          <span className="ml-vpn-link__arrow">→</span>
        </div>
        <StepNode
          icon={<Icon icon={Router} variant="detail" />}
          label={t('vpn.panel.server')}
          sub={
            activeProfile?.serverName && activeProfile?.serverHost
              ? `${activeProfile.serverName} (${activeProfile.serverHost})`
              : activeProfile?.serverHost || '—'
          }
          ok={connected}
        />
        <div className="ml-vpn-link">
          <span className="ml-vpn-link__arrow">→</span>
        </div>
        <StepNode
          icon={<Icon icon={Server} variant="detail" />}
          label={t('vpn.panel.privateNetwork')}
          sub={activeProfile?.organization || t('vpn.panel.clusterEndpoints')}
          ok={connected}
        />
      </div>

      {connected && (
        <>
          <Row gutter={[16, 12]} style={{ marginTop: 20 }}>
            <Col xs={24} md={12}>
              <Typography.Text type="secondary">{t('vpn.panel.download')}</Typography.Text>
              <div className="ml-vpn-traffic-row">
                <Progress
                  percent={barPercent(rxRate)}
                  showInfo={false}
                  strokeColor="#3ecf8e"
                  trailColor="rgba(255,255,255,0.08)"
                  size="small"
                />
                <Typography.Text strong>{formatBitrate(rxRate)}</Typography.Text>
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('vpn.panel.total', { size: formatByteSize(stats?.rxBytes ?? 0) })}
              </Typography.Text>
            </Col>
            <Col xs={24} md={12}>
              <Typography.Text type="secondary">{t('vpn.panel.upload')}</Typography.Text>
              <div className="ml-vpn-traffic-row">
                <Progress
                  percent={barPercent(txRate)}
                  showInfo={false}
                  strokeColor="#5b9cf5"
                  trailColor="rgba(255,255,255,0.08)"
                  size="small"
                />
                <Typography.Text strong>{formatBitrate(txRate)}</Typography.Text>
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('vpn.panel.total', { size: formatByteSize(stats?.txBytes ?? 0) })}
              </Typography.Text>
            </Col>
          </Row>

          <div className="ml-vpn-checklist" style={{ marginTop: 16 }}>
            {checks.map((c) => (
              <div key={c.key} className="ml-vpn-checklist__item">
                {c.ok ? (
                  <Icon icon={CheckCircle2} variant="detail" className="ml-vpn-checklist__ok" />
                ) : (
                  <Icon icon={Circle} variant="detail" className="ml-vpn-checklist__pending" />
                )}
                <Typography.Text>{c.label}</Typography.Text>
              </div>
            ))}
          </div>

          {falsePositive && (
            <Typography.Paragraph type="warning" style={{ marginTop: 12, marginBottom: 0 }}>
              {falsePositive}
            </Typography.Paragraph>
          )}

          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
            {t('vpn.panel.providerLine', { provider: status?.provider ?? '—' })}
            {status?.connectedAt ? ` · ${t('vpn.panel.connectedAgo', { uptime: uptime ?? '' })}` : ''}
            {status?.message ? ` · ${status.message}` : ''}
          </Typography.Paragraph>
        </>
      )}

      {!connected && status?.status === 'error' && (
        <Typography.Paragraph type="danger" style={{ marginTop: 12, marginBottom: 0 }}>
          {status.message ?? t('vpn.panel.connectionFailed')}
        </Typography.Paragraph>
      )}
    </Card>
  )
}
