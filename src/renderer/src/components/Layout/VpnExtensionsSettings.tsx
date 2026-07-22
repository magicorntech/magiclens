import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Space, Tag, Typography, message } from 'antd'
import { CheckCircle2, Download, RefreshCw, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AppInfoResponse } from '@shared/types/app'
import { useVpnStore } from '../../stores/vpnStore'
import { Icon } from '../ui/Icon'

type PlatformGroup = 'darwin' | 'win32' | 'linux' | 'other'

function platformGroup(platform: string | undefined): PlatformGroup {
  if (platform === 'darwin' || platform === 'win32' || platform === 'linux') return platform
  return 'other'
}

export function VpnExtensionsSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const status = useVpnStore((s) => s.status)
  const refresh = useVpnStore((s) => s.refresh)
  const [appInfo, setAppInfo] = useState<AppInfoResponse | null>(null)
  const [installing, setInstalling] = useState<'openvpn' | 'wireguard' | null>(null)

  useEffect(() => {
    void window.api.app.getInfo().then(setAppInfo)
    void refresh()
  }, [refresh])

  const group = platformGroup(appInfo?.platform)
  const tools = status?.tools
  const openvpnReady = !!(tools?.openvpn || tools?.openvpnPath || tools?.tunnelblick)
  const wireguardReady = !!(tools?.wireguard || tools?.wgQuickPath || tools?.wireguardApp)

  const packages = useMemo(() => {
    if (group === 'darwin') {
      return [
        { id: 'openvpn', cmd: 'brew install openvpn' },
        { id: 'wireguard', cmd: 'brew install wireguard-tools' },
        { id: 'tunnelblick', cmd: 'brew install --cask tunnelblick' },
        { id: 'wireguardApp', cmd: 'brew install --cask wireguard' }
      ]
    }
    if (group === 'win32') {
      return [
        { id: 'openvpn', cmd: 'winget install -e --id OpenVPNTechnologies.OpenVPN' },
        { id: 'wireguard', cmd: 'winget install -e --id WireGuard.WireGuard' },
        { id: 'chocoOpenvpn', cmd: 'choco install openvpn -y' },
        { id: 'chocoWireguard', cmd: 'choco install wireguard -y' }
      ]
    }
    if (group === 'linux') {
      return [
        { id: 'aptOpenvpn', cmd: 'sudo apt-get install -y openvpn' },
        { id: 'aptWireguard', cmd: 'sudo apt-get install -y wireguard-tools' },
        { id: 'brewOpenvpn', cmd: 'brew install openvpn' },
        { id: 'brewWireguard', cmd: 'brew install wireguard-tools' }
      ]
    }
    return [
      { id: 'openvpn', cmd: 'brew install openvpn' },
      { id: 'wireguard', cmd: 'brew install wireguard-tools' }
    ]
  }, [group])

  const manualSteps = useMemo(() => {
    const key =
      group === 'darwin'
        ? 'settings.vpnExtensions.manual.darwin'
        : group === 'win32'
          ? 'settings.vpnExtensions.manual.win32'
          : group === 'linux'
            ? 'settings.vpnExtensions.manual.linux'
            : 'settings.vpnExtensions.manual.other'
    const steps = t(key, { returnObjects: true })
    return Array.isArray(steps) ? (steps as string[]) : []
  }, [group, t])

  async function install(kind: 'openvpn' | 'wireguard'): Promise<void> {
    setInstalling(kind)
    try {
      const res = await window.api.vpn.installTool(kind)
      await refresh()
      if (res.ok) message.success(t('settings.vpnExtensions.installSuccess', { tool: kind }))
      else message.error(res.error ?? t('settings.vpnExtensions.installFailed'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('settings.vpnExtensions.installFailed'))
    } finally {
      setInstalling(null)
    }
  }

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {t('settings.vpnExtensions.intro')}
      </Typography.Text>

      <Alert
        type="info"
        showIcon
        message={t('settings.vpnExtensions.platformLabel', {
          platform: appInfo?.platform ?? '…'
        })}
        description={t(`settings.vpnExtensions.platformHint.${group}`)}
      />

      <div>
        <Typography.Text strong>{t('settings.vpnExtensions.statusTitle')}</Typography.Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <Tag
            icon={
              <Icon icon={openvpnReady ? CheckCircle2 : XCircle} variant="detail" />
            }
            color={openvpnReady ? 'success' : 'default'}
          >
            OpenVPN {openvpnReady ? t('settings.vpnExtensions.ready') : t('settings.vpnExtensions.missing')}
          </Tag>
          <Tag
            icon={
              <Icon icon={wireguardReady ? CheckCircle2 : XCircle} variant="detail" />
            }
            color={wireguardReady ? 'success' : 'default'}
          >
            WireGuard{' '}
            {wireguardReady ? t('settings.vpnExtensions.ready') : t('settings.vpnExtensions.missing')}
          </Tag>
          {tools?.tunnelblick && <Tag color="processing">Tunnelblick</Tag>}
          {tools?.wireguardApp && <Tag color="processing">WireGuard app</Tag>}
        </div>
        <Button
          size="small"
          icon={<Icon icon={RefreshCw} variant="action" />}
          style={{ marginTop: 10 }}
          onClick={() => void refresh()}
        >
          {t('settings.vpnExtensions.rescan')}
        </Button>
      </div>

      <div>
        <Typography.Text strong>{t('settings.vpnExtensions.installTitle')}</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 10 }}>
          {t('settings.vpnExtensions.installHint')}
        </Typography.Paragraph>
        <Space wrap>
          <Button
            type="primary"
            icon={<Icon icon={Download} variant="action" />}
            loading={installing === 'openvpn'}
            disabled={installing !== null}
            onClick={() => void install('openvpn')}
          >
            {t('settings.vpnExtensions.installOpenVpn')}
          </Button>
          <Button
            icon={<Icon icon={Download} variant="action" />}
            loading={installing === 'wireguard'}
            disabled={installing !== null}
            onClick={() => void install('wireguard')}
          >
            {t('settings.vpnExtensions.installWireGuard')}
          </Button>
        </Space>
      </div>

      <div>
        <Typography.Text strong>{t('settings.vpnExtensions.packagesTitle')}</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 8 }}>
          {t('settings.vpnExtensions.packagesHint')}
        </Typography.Paragraph>
        <Space orientation="vertical" style={{ width: '100%' }} size={6}>
          {packages.map((pkg) => (
            <Typography.Text
              key={pkg.id}
              code
              copyable
              style={{ display: 'block', whiteSpace: 'pre-wrap', fontSize: 12 }}
            >
              {pkg.cmd}
            </Typography.Text>
          ))}
        </Space>
      </div>

      <div>
        <Typography.Text strong>{t('settings.vpnExtensions.manualTitle')}</Typography.Text>
        <ol style={{ margin: '8px 0 0', paddingInlineStart: 18, fontSize: 13 }}>
          {manualSteps.map((step) => (
            <li key={step} style={{ marginBottom: 6 }}>
              {step}
            </li>
          ))}
        </ol>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          {t('settings.vpnExtensions.connectNote')}
        </Typography.Paragraph>
      </div>
    </Space>
  )
}
