import { useEffect, useMemo, useState } from 'react'
import { Button, message } from 'antd'
import { CheckCircle2, Copy, Download, RefreshCw, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AppInfoResponse } from '@shared/types/app'
import { useVpnStore } from '../../stores/vpnStore'
import { Icon } from '../ui/Icon'
import { SettingsSection } from './SettingsPrimitives'

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
        { id: 'openvpn', label: 'OpenVPN', cmd: 'brew install openvpn' },
        { id: 'wireguard', label: 'WireGuard tools', cmd: 'brew install wireguard-tools' },
        { id: 'tunnelblick', label: 'Tunnelblick', cmd: 'brew install --cask tunnelblick' },
        { id: 'wireguardApp', label: 'WireGuard app', cmd: 'brew install --cask wireguard' }
      ]
    }
    if (group === 'win32') {
      return [
        {
          id: 'openvpn',
          label: 'OpenVPN (winget)',
          cmd: 'winget install -e --id OpenVPNTechnologies.OpenVPN'
        },
        {
          id: 'wireguard',
          label: 'WireGuard (winget)',
          cmd: 'winget install -e --id WireGuard.WireGuard'
        },
        { id: 'chocoOpenvpn', label: 'OpenVPN (choco)', cmd: 'choco install openvpn -y' },
        { id: 'chocoWireguard', label: 'WireGuard (choco)', cmd: 'choco install wireguard -y' }
      ]
    }
    if (group === 'linux') {
      return [
        { id: 'aptOpenvpn', label: 'OpenVPN (apt)', cmd: 'sudo apt-get install -y openvpn' },
        {
          id: 'aptWireguard',
          label: 'WireGuard (apt)',
          cmd: 'sudo apt-get install -y wireguard-tools'
        },
        { id: 'brewOpenvpn', label: 'OpenVPN (brew)', cmd: 'brew install openvpn' },
        { id: 'brewWireguard', label: 'WireGuard (brew)', cmd: 'brew install wireguard-tools' }
      ]
    }
    return [
      { id: 'openvpn', label: 'OpenVPN', cmd: 'brew install openvpn' },
      { id: 'wireguard', label: 'WireGuard tools', cmd: 'brew install wireguard-tools' }
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

  async function copyCmd(cmd: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(cmd)
      message.success(t('settings.vpnExtensions.copied'))
    } catch {
      message.error(t('settings.vpnExtensions.copyFailed'))
    }
  }

  return (
    <>
      <SettingsSection
        title={t('settings.vpnExtensions.statusTitle')}
        description={t(`settings.vpnExtensions.platformHint.${group}`)}
        actions={
          <Button
            size="small"
            icon={<Icon icon={RefreshCw} variant="detail" />}
            onClick={() => void refresh()}
          >
            {t('settings.vpnExtensions.rescan')}
          </Button>
        }
      >
        <div className="ml-vpn-ext-platform">
          <span className="ml-vpn-ext-platform__label">
            {t('settings.vpnExtensions.platformLabel', {
              platform: appInfo?.platform ?? '…'
            })}
          </span>
        </div>
        <div className="ml-vpn-ext-status">
          <div className={`ml-vpn-ext-chip${openvpnReady ? ' is-ready' : ' is-missing'}`}>
            <Icon icon={openvpnReady ? CheckCircle2 : XCircle} variant="detail" />
            <div>
              <div className="ml-vpn-ext-chip__name">OpenVPN</div>
              <div className="ml-vpn-ext-chip__state">
                {openvpnReady
                  ? t('settings.vpnExtensions.ready')
                  : t('settings.vpnExtensions.missing')}
              </div>
            </div>
          </div>
          <div className={`ml-vpn-ext-chip${wireguardReady ? ' is-ready' : ' is-missing'}`}>
            <Icon icon={wireguardReady ? CheckCircle2 : XCircle} variant="detail" />
            <div>
              <div className="ml-vpn-ext-chip__name">WireGuard</div>
              <div className="ml-vpn-ext-chip__state">
                {wireguardReady
                  ? t('settings.vpnExtensions.ready')
                  : t('settings.vpnExtensions.missing')}
              </div>
            </div>
          </div>
          {tools?.tunnelblick ? (
            <div className="ml-vpn-ext-chip is-ready">
              <Icon icon={CheckCircle2} variant="detail" />
              <div>
                <div className="ml-vpn-ext-chip__name">Tunnelblick</div>
                <div className="ml-vpn-ext-chip__state">{t('settings.vpnExtensions.ready')}</div>
              </div>
            </div>
          ) : null}
          {tools?.wireguardApp ? (
            <div className="ml-vpn-ext-chip is-ready">
              <Icon icon={CheckCircle2} variant="detail" />
              <div>
                <div className="ml-vpn-ext-chip__name">WireGuard app</div>
                <div className="ml-vpn-ext-chip__state">{t('settings.vpnExtensions.ready')}</div>
              </div>
            </div>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('settings.vpnExtensions.installTitle')}
        description={t('settings.vpnExtensions.installHint')}
      >
        <div className="ml-vpn-ext-actions">
          <Button
            type="primary"
            icon={<Icon icon={Download} variant="detail" />}
            loading={installing === 'openvpn'}
            disabled={installing !== null}
            onClick={() => void install('openvpn')}
          >
            {t('settings.vpnExtensions.installOpenVpn')}
          </Button>
          <Button
            icon={<Icon icon={Download} variant="detail" />}
            loading={installing === 'wireguard'}
            disabled={installing !== null}
            onClick={() => void install('wireguard')}
          >
            {t('settings.vpnExtensions.installWireGuard')}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('settings.vpnExtensions.packagesTitle')}
        description={t('settings.vpnExtensions.packagesHint')}
      >
        <div className="ml-vpn-ext-cmds">
          {packages.map((pkg) => (
            <div key={pkg.id} className="ml-vpn-ext-cmd">
              <div className="ml-vpn-ext-cmd__meta">
                <span className="ml-vpn-ext-cmd__label">{pkg.label}</span>
                <code className="ml-vpn-ext-cmd__code">{pkg.cmd}</code>
              </div>
              <button
                type="button"
                className="ml-vpn-ext-cmd__copy"
                onClick={() => void copyCmd(pkg.cmd)}
                aria-label={t('settings.vpnExtensions.copyCmd')}
              >
                <Icon icon={Copy} variant="detail" />
              </button>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('settings.vpnExtensions.manualTitle')}
        description={t('settings.vpnExtensions.connectNote')}
      >
        <ol className="ml-vpn-ext-steps">
          {manualSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </SettingsSection>
    </>
  )
}
