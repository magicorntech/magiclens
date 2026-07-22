import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message
} from 'antd'
import type { MenuProps } from 'antd'
import {
  FilePlus2,
  ClipboardPaste,
  MoreHorizontal,
  Network,
  RefreshCw,
  FolderOpen,
  Pencil,
  Trash2,
  Unplug,
  ShieldCheck,
  Search
} from 'lucide-react'
import type { VpnProfileSummary } from '@shared/types/vpn'
import { parseVpnConfigMeta } from '@shared/types/vpn'
import { useVpnStore } from '../stores/vpnStore'
import { useVpnSessionStore } from '../stores/vpnSessionStore'
import { VpnConnectionPanel } from '../components/Vpn/VpnConnectionPanel'
import { VpnDottedWorldMap } from '../components/Vpn/VpnDottedWorldMap'
import { Icon } from '../components/ui/Icon'

type ProfileDraft = {
  id?: string
  name: string
  config?: string
  provider?: string
  username?: string
  organization?: string
  serverHost?: string
  serverName?: string
  protocol?: string
  mode: 'create' | 'edit'
}

function statusTone(
  status: string | undefined
): 'connected' | 'connecting' | 'error' | 'idle' {
  if (status === 'connected') return 'connected'
  if (status === 'connecting') return 'connecting'
  if (status === 'error') return 'error'
  return 'idle'
}

function serverLabel(row: VpnProfileSummary): string {
  if (row.serverName && row.serverHost) return `${row.serverName} · ${row.serverHost}`
  return row.serverHost || row.serverName || 'No server set'
}

export function VpnPage(): React.JSX.Element {
  const profiles = useVpnStore((s) => s.profiles)
  const status = useVpnStore((s) => s.status)
  const loading = useVpnStore((s) => s.loading)
  const hydrate = useVpnStore((s) => s.hydrate)
  const refresh = useVpnStore((s) => s.refresh)
  const pickFileDraft = useVpnStore((s) => s.pickFileDraft)
  const addFromDraft = useVpnStore((s) => s.addFromDraft)
  const updateProfile = useVpnStore((s) => s.updateProfile)
  const remove = useVpnStore((s) => s.remove)
  const connect = useVpnStore((s) => s.connect)
  const disconnect = useVpnStore((s) => s.disconnect)
  const reveal = useVpnStore((s) => s.reveal)
  const subscribeStatus = useVpnStore((s) => s.subscribeStatus)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [authProfile, setAuthProfile] = useState<VpnProfileSummary | null>(null)
  const [authExternal, setAuthExternal] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [profileQuery, setProfileQuery] = useState('')
  const [authForm] = Form.useForm()
  const [draftForm] = Form.useForm()

  useEffect(() => {
    void hydrate()
    return subscribeStatus()
  }, [])

  useEffect(() => {
    if (!draft) return
    draftForm.setFieldsValue({
      name: draft.name,
      username: draft.username ?? '',
      organization: draft.organization ?? '',
      serverHost: draft.serverHost ?? '',
      serverName: draft.serverName ?? '',
      protocol: draft.protocol ?? '',
      provider: draft.provider ?? 'openvpn'
    })
  }, [draft])

  const tools = status?.tools
  const activeId = status?.activeProfileId
  const activeProfile = profiles.find((p) => p.id === activeId)
  const connectedIds = new Set(status?.connectedProfileIds ?? [])
  const anyConnected = status?.status === 'connected' || connectedIds.size > 0
  const tone = statusTone(status?.status)

  const filteredProfiles = useMemo(() => {
    const q = profileQuery.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((p) => {
      const hay = [
        p.name,
        p.username,
        p.organization,
        p.serverHost,
        p.serverName,
        p.provider,
        p.protocol,
        p.origin
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [profiles, profileQuery])

  async function openConnect(row: VpnProfileSummary, preferExternal = false): Promise<void> {
    if (row.provider === 'wireguard' || preferExternal) {
      setBusyId(row.id)
      try {
        const res = await connect(row.id, { preferExternal })
        if (res.ok) message.success(preferExternal ? 'Opened in system VPN app' : 'Connected')
        else message.error(res.error ?? 'Connect failed')
      } finally {
        setBusyId(null)
      }
      return
    }

    setAuthExternal(preferExternal)
    setAuthProfile(row)
    authForm.setFieldsValue({
      username: row.username || '',
      pin: '',
      mfaCode: ''
    })
  }

  function openEdit(row: VpnProfileSummary): void {
    setDraft({
      id: row.id,
      mode: 'edit',
      name: row.name,
      username: row.username,
      organization: row.organization,
      serverHost: row.serverHost,
      serverName: row.serverName,
      protocol: row.protocol,
      provider: row.provider
    })
  }

  async function startAddFromFile(): Promise<void> {
    const picked = await pickFileDraft()
    if (!picked.ok) return
    setDraft({
      mode: 'create',
      name: picked.name,
      config: picked.config,
      provider: picked.provider,
      username: picked.username,
      organization: picked.organization,
      serverHost: picked.serverHost,
      serverName: picked.serverName,
      protocol: picked.protocol
    })
  }

  function profileMenu(row: VpnProfileSummary): MenuProps {
    const items: MenuProps['items'] = [
      {
        key: 'edit',
        icon: <Icon icon={Pencil} variant="detail" />,
        label: 'Edit profile',
        onClick: () => openEdit(row)
      },
      {
        key: 'reveal',
        icon: <Icon icon={FolderOpen} variant="detail" />,
        label: 'Reveal file',
        onClick: () => void reveal(row.id)
      },
      {
        key: 'external',
        label: 'Open externally',
        disabled: !row.hasConfig,
        onClick: () => void openConnect(row, true)
      }
    ]
    if (row.origin === 'local') {
      items.push({ type: 'divider' })
      items.push({
        key: 'delete',
        danger: true,
        icon: <Icon icon={Trash2} variant="detail" />,
        label: 'Delete',
        onClick: async () => {
          await remove(row.id)
          message.success('Removed')
        }
      })
    }
    return { items }
  }

  return (
    <div className="ml-vpn-page">
      <div className="ml-vpn-page__stage">
        <div className="ml-vpn-page__layout">
          <div className="ml-vpn-page__map-col">
            <div className="ml-vpn-page__backdrop" aria-hidden>
              <VpnDottedWorldMap connected={anyConnected} />
              <div className="ml-vpn-page__backdrop-glow" />
            </div>

            <header className="ml-vpn-hero ml-vpn-hero--overlay">
              <div className="ml-vpn-hero__copy">
                <div className="ml-vpn-hero__eyebrow">
                  <Icon icon={Network} variant="action" />
                  <span>Secure tunnel</span>
                </div>
                <Typography.Title level={2} className="ml-vpn-hero__title">
                  VPN
                </Typography.Title>
              </div>

              <div className={`ml-vpn-status-pill ml-vpn-status-pill--${tone}`}>
                <span className="ml-vpn-status-pill__dot" />
                <div className="ml-vpn-status-pill__text">
                  <strong>
                    {tone === 'connected'
                      ? 'Connected'
                      : tone === 'connecting'
                        ? 'Connecting'
                        : tone === 'error'
                          ? 'Error'
                          : 'Disconnected'}
                  </strong>
                  <span>
                    {status?.message ||
                      (connectedIds.size > 1
                        ? `${connectedIds.size} tunnels up`
                        : activeProfile?.name || 'No active profile')}
                  </span>
                </div>
                {anyConnected && (
                  <Button
                    size="small"
                    danger
                    icon={<Icon icon={Unplug} variant="action" />}
                    onClick={async () => {
                      await disconnect()
                      message.success('Disconnected')
                    }}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </header>

            <div className="ml-vpn-page__map-spacer" />

            {tools && !tools.openvpn && !tools.wireguard && !tools.tunnelblick && !tools.wireguardApp && (
              <Alert
                className="ml-vpn-tools-alert"
                type="info"
                showIcon
                message="No VPN tools detected"
                description="Install OpenVPN (brew install openvpn), Tunnelblick, WireGuard.app, or wireguard-tools."
              />
            )}

            <div className="ml-vpn-panel-shell ml-vpn-panel-shell--dock">
              <VpnConnectionPanel status={status} activeProfile={activeProfile} />
            </div>
          </div>

          <aside className="ml-vpn-sidebar">
            <div className="ml-vpn-sidebar__head">
              <div>
                <Typography.Title level={4} className="ml-vpn-section__title">
                  VPN profiles
                </Typography.Title>
                <Typography.Text type="secondary" className="ml-vpn-sidebar__count">
                  {profiles.length === 0
                    ? 'Add a config to get started'
                    : `${filteredProfiles.length} of ${profiles.length}`}
                </Typography.Text>
              </div>
            </div>

            <Input
              allowClear
              className="ml-vpn-sidebar__search"
              prefix={<Icon icon={Search} variant="action" />}
              placeholder="Search profiles…"
              value={profileQuery}
              onChange={(e) => setProfileQuery(e.target.value)}
            />

            <div className="ml-vpn-toolbar ml-vpn-toolbar--sidebar">
              <Button
                type="primary"
                icon={<Icon icon={FilePlus2} variant="action" />}
                onClick={() => void startAddFromFile()}
              >
                Add file
              </Button>
              <Button
                icon={<Icon icon={ClipboardPaste} variant="action" />}
                onClick={() => setPasteOpen(true)}
              >
                Paste
              </Button>
              <Button
                icon={<Icon icon={RefreshCw} variant="action" />}
                onClick={() => void refresh()}
                loading={loading}
                aria-label="Refresh"
              />
            </div>

            <div className="ml-vpn-sidebar__list">
              {profiles.length === 0 ? (
                <div className="ml-vpn-empty">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span>
                        Drop in an <strong>.ovpn</strong> or WireGuard <strong>.conf</strong>
                      </span>
                    }
                  >
                    <Space wrap>
                      <Button type="primary" size="small" onClick={() => void startAddFromFile()}>
                        Choose file
                      </Button>
                      <Button size="small" onClick={() => setPasteOpen(true)}>
                        Paste
                      </Button>
                    </Space>
                  </Empty>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="ml-vpn-empty">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={`No profiles match “${profileQuery.trim()}”`}
                  />
                </div>
              ) : (
                filteredProfiles.map((row) => {
                  const isLive = connectedIds.has(row.id) || (activeId === row.id && anyConnected)
                  return (
                    <article
                      key={row.id}
                      className={`ml-vpn-profile-card${isLive ? ' ml-vpn-profile-card--live' : ''}`}
                    >
                      <div className="ml-vpn-profile-card__top">
                        <div className="ml-vpn-profile-card__icon">
                          <Icon icon={isLive ? ShieldCheck : Network} variant="action" />
                        </div>
                        <div className="ml-vpn-profile-card__titles">
                          <div className="ml-vpn-profile-card__name-row">
                            <Typography.Text strong className="ml-vpn-profile-card__name">
                              {row.name}
                            </Typography.Text>
                            {isLive && <Tag color="success">Live</Tag>}
                          </div>
                          <Typography.Text type="secondary" className="ml-vpn-profile-card__meta">
                            {row.username || 'Username not set'} · {serverLabel(row)}
                          </Typography.Text>
                        </div>
                        <Dropdown menu={profileMenu(row)} trigger={['click']}>
                          <Button
                            type="text"
                            className="ml-vpn-profile-card__more"
                            icon={<Icon icon={MoreHorizontal} variant="action" />}
                            aria-label="More actions"
                          />
                        </Dropdown>
                      </div>

                      <div className="ml-vpn-profile-card__tags">
                        <Tag>{row.provider}</Tag>
                        {row.organization ? <Tag>{row.organization}</Tag> : null}
                        {row.protocol ? <Tag>{row.protocol}</Tag> : null}
                      </div>

                      <div className="ml-vpn-profile-card__actions">
                        {isLive ? (
                          <Button
                            danger
                            block
                            loading={busyId === row.id}
                            icon={<Icon icon={Unplug} variant="action" />}
                            onClick={async () => {
                              setBusyId(row.id)
                              try {
                                await disconnect(row.id)
                                message.success('Disconnected')
                              } finally {
                                setBusyId(null)
                              }
                            }}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            block
                            disabled={!row.hasConfig}
                            loading={busyId === row.id}
                            onClick={() => void openConnect(row, false)}
                          >
                            Connect
                          </Button>
                        )}
                        <Button block onClick={() => openEdit(row)}>
                          Edit
                        </Button>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </aside>
        </div>
      </div>

      <Modal
        title={draft?.mode === 'edit' ? 'Edit VPN profile' : 'Review VPN profile'}
        open={!!draft}
        onCancel={() => setDraft(null)}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Correct auto-detected fields"
          description="Username / organization / server are parsed from the .ovpn and are often wrong — edit them before saving."
        />
        <Form
          form={draftForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!draft) return
            if (draft.mode === 'edit' && draft.id) {
              const res = await updateProfile({
                id: draft.id,
                name: values.name,
                username: values.username?.trim() || '',
                organization: values.organization?.trim() || '',
                serverHost: values.serverHost?.trim() || '',
                serverName: values.serverName?.trim() || '',
                protocol: values.protocol?.trim() || ''
              })
              if (!res.ok) {
                message.error(res.error ?? 'Update failed')
                return
              }
              message.success('Profile updated')
            } else {
              if (!draft.config) {
                message.error('Missing config')
                return
              }
              await addFromDraft({
                name: values.name,
                config: draft.config,
                provider: values.provider || draft.provider,
                username: values.username?.trim() || '',
                organization: values.organization?.trim() || '',
                serverHost: values.serverHost?.trim() || '',
                serverName: values.serverName?.trim() || '',
                protocol: values.protocol?.trim() || ''
              })
              message.success('VPN profile added')
            }
            setDraft(null)
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {draft?.mode === 'create' && (
            <Form.Item name="provider" label="Provider">
              <Select
                options={[
                  { value: 'openvpn', label: 'OpenVPN (.ovpn)' },
                  { value: 'pritunl', label: 'Pritunl (.ovpn)' },
                  { value: 'wireguard', label: 'WireGuard (.conf)' },
                  { value: 'generic', label: 'Auto-detect' }
                ]}
              />
            </Form.Item>
          )}
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Enter VPN username' }]}
          >
            <Input placeholder="user@company.com" autoFocus />
          </Form.Item>
          <Form.Item name="organization" label="Organization">
            <Input placeholder="Organization name" />
          </Form.Item>
          <Form.Item name="serverName" label="Server name">
            <Input placeholder="master" />
          </Form.Item>
          <Form.Item name="serverHost" label="Server host">
            <Input placeholder="34.107.68.139" />
          </Form.Item>
          <Form.Item name="protocol" label="Protocol">
            <Input placeholder="udp / tcp" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            {draft?.mode === 'edit' ? 'Save changes' : 'Save profile'}
          </Button>
        </Form>
      </Modal>

      <Modal
        title={`Connect · ${authProfile?.name ?? ''}`}
        open={!!authProfile}
        onCancel={() => setAuthProfile(null)}
        footer={null}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="PIN + MFA only"
          description="Username / server / organization come from the profile. Use Edit if they are wrong."
        />
        <div style={{ marginBottom: 16, lineHeight: 1.7 }}>
          <div>
            <Typography.Text type="secondary">User: </Typography.Text>
            <Typography.Text strong>{authProfile?.username || 'not set — edit profile'}</Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">Server: </Typography.Text>
            <Typography.Text strong>
              {authProfile?.serverName && authProfile?.serverHost
                ? `${authProfile.serverName} (${authProfile.serverHost})`
                : authProfile?.serverHost || authProfile?.serverName || '—'}
            </Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">Organization: </Typography.Text>
            <Typography.Text strong>{authProfile?.organization || '—'}</Typography.Text>
          </div>
        </div>
        <Form
          form={authForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!authProfile) return
            const username = authProfile.username || values.username
            if (!username) {
              message.error('Set username via Edit first, or enter it below')
              return
            }
            setBusyId(authProfile.id)
            try {
              const res = await connect(authProfile.id, {
                preferExternal: authExternal,
                credentials: {
                  username,
                  pin: values.pin,
                  mfaCode: values.mfaCode
                }
              })
              if (res.ok) {
                useVpnSessionStore.getState().setCredentials(authProfile.id, {
                  pin: values.pin,
                  mfaCode: values.mfaCode
                })
                message.success('Connected')
                setAuthProfile(null)
              } else {
                message.error(res.error ?? 'Connect failed')
              }
            } finally {
              setBusyId(null)
            }
          }}
        >
          {!authProfile?.username && (
            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
              <Input autoFocus placeholder="user@company.com" />
            </Form.Item>
          )}
          <Form.Item name="pin" label="PIN" rules={[{ required: true, message: 'Enter your PIN' }]}>
            <Input.Password autoFocus={!!authProfile?.username} placeholder="VPN PIN" />
          </Form.Item>
          <Form.Item
            name="mfaCode"
            label="MFA / OTP code"
            rules={[{ required: true, message: 'Enter your MFA/OTP code' }]}
          >
            <Input placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" />
          </Form.Item>
          <Space style={{ width: '100%' }} direction="vertical">
            <Button type="primary" htmlType="submit" block loading={busyId === authProfile?.id}>
              Connect
            </Button>
            <Button
              block
              onClick={() => {
                if (authProfile) {
                  setAuthProfile(null)
                  openEdit(authProfile)
                }
              }}
            >
              Edit profile fields
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal title="Paste VPN config" open={pasteOpen} onCancel={() => setPasteOpen(false)} footer={null}>
        <Form
          layout="vertical"
          initialValues={{ provider: 'openvpn' }}
          onFinish={async (values) => {
            setPasteOpen(false)
            const meta = parseVpnConfigMeta(values.config, values.name)
            setDraft({
              mode: 'create',
              name: values.name,
              config: values.config,
              provider: values.provider,
              username: meta.username ?? '',
              organization: meta.organization ?? '',
              serverHost: meta.serverHost ?? '',
              serverName: meta.serverName ?? '',
              protocol: meta.protocol ?? ''
            })
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Office VPN" />
          </Form.Item>
          <Form.Item name="provider" label="Provider">
            <Select
              options={[
                { value: 'openvpn', label: 'OpenVPN (.ovpn)' },
                { value: 'pritunl', label: 'Pritunl (.ovpn)' },
                { value: 'wireguard', label: 'WireGuard (.conf)' },
                { value: 'generic', label: 'Auto-detect' }
              ]}
            />
          </Form.Item>
          <Form.Item name="config" label="Config" rules={[{ required: true }]}>
            <Input.TextArea rows={12} placeholder="Paste .ovpn or WireGuard config" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Continue — review fields
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
