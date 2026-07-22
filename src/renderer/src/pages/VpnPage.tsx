import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import type { VpnProfileSummary } from '@shared/types/vpn'
import { parseVpnConfigMeta } from '@shared/types/vpn'
import { useAuthStore } from '../stores/authStore'
import { useVpnStore } from '../stores/vpnStore'
import { useVpnSessionStore } from '../stores/vpnSessionStore'
import { VpnConnectionPanel } from '../components/Vpn/VpnConnectionPanel'

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

export function VpnPage(): React.JSX.Element {
  const me = useAuthStore((s) => s.me)
  const profiles = useVpnStore((s) => s.profiles)
  const status = useVpnStore((s) => s.status)
  const loading = useVpnStore((s) => s.loading)
  const hydrate = useVpnStore((s) => s.hydrate)
  const refresh = useVpnStore((s) => s.refresh)
  const pickFileDraft = useVpnStore((s) => s.pickFileDraft)
  const addFromDraft = useVpnStore((s) => s.addFromDraft)
  const addFromPaste = useVpnStore((s) => s.addFromPaste)
  const updateProfile = useVpnStore((s) => s.updateProfile)
  const remove = useVpnStore((s) => s.remove)
  const connect = useVpnStore((s) => s.connect)
  const disconnect = useVpnStore((s) => s.disconnect)
  const reveal = useVpnStore((s) => s.reveal)
  const syncOrgProfiles = useVpnStore((s) => s.syncOrgProfiles)
  const subscribeStatus = useVpnStore((s) => s.subscribeStatus)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [authProfile, setAuthProfile] = useState<VpnProfileSummary | null>(null)
  const [authExternal, setAuthExternal] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
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
  const connected = status?.status === 'connected'

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

  return (
    <div className="ml-admin-page" style={{ padding: 24, overflow: 'auto' }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        VPN
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        After importing an .ovpn, review and edit User / Organization / Server if auto-detect is wrong.
        Connect asks only for PIN and MFA.
      </Typography.Paragraph>

      <Space wrap style={{ marginBottom: 16 }}>
        <Badge
          status={
            connected
              ? 'success'
              : status?.status === 'connecting'
                ? 'processing'
                : status?.status === 'error'
                  ? 'error'
                  : 'default'
          }
          text={
            connected
              ? `Connected${status?.message ? ` · ${status.message}` : ''}`
              : status?.status === 'connecting'
                ? 'Connecting…'
                : status?.status === 'error'
                  ? status.message ?? 'Error'
                  : 'Disconnected'
          }
        />
        {connected && (
          <Button
            danger
            onClick={async () => {
              await disconnect()
              message.success('Disconnected')
            }}
          >
            Disconnect
          </Button>
        )}
      </Space>

      <VpnConnectionPanel status={status} activeProfile={activeProfile} />

      {tools && !tools.openvpn && !tools.wireguard && !tools.tunnelblick && !tools.wireguardApp && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="No VPN tools detected"
          description="Install OpenVPN (brew install openvpn), Tunnelblick, WireGuard.app, or wireguard-tools."
        />
      )}

      <Space wrap style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => void startAddFromFile()}>
          Add from file (.ovpn / .conf)
        </Button>
        <Button onClick={() => setPasteOpen(true)}>Paste config</Button>
        <Button
          disabled={!me}
          onClick={async () => {
            await useAuthStore.getState().refreshMe()
            const n = await syncOrgProfiles()
            await refresh()
            message.success(n > 0 ? `Synced ${n} org VPN profile(s)` : 'No org VPN configs to sync')
          }}
        >
          Sync org profiles
        </Button>
        <Button onClick={() => void refresh()} loading={loading}>
          Refresh
        </Button>
      </Space>

      <Table<VpnProfileSummary>
        rowKey="id"
        loading={loading}
        dataSource={profiles}
        pagination={false}
        columns={[
          {
            title: 'Name',
            dataIndex: 'name',
            render: (name: string, row) => (
              <Space>
                {name}
                {activeId === row.id && connected && <Tag color="success">active</Tag>}
              </Space>
            )
          },
          { title: 'User', dataIndex: 'username', render: (v?: string) => v || '—' },
          { title: 'Organization', dataIndex: 'organization', render: (v?: string) => v || '—' },
          {
            title: 'Server',
            render: (_: unknown, row: VpnProfileSummary) =>
              row.serverName && row.serverHost
                ? `${row.serverName} (${row.serverHost})`
                : row.serverHost || row.serverName || '—'
          },
          {
            title: 'Provider',
            dataIndex: 'provider',
            render: (p: string) => <Tag>{p}</Tag>
          },
          {
            title: 'Origin',
            dataIndex: 'origin',
            render: (o: string) => <Tag color={o === 'org' ? 'blue' : 'default'}>{o}</Tag>
          },
          {
            title: 'Actions',
            render: (_, row) => {
              const isActive = activeId === row.id && connected
              return (
                <Space wrap>
                  {isActive ? (
                    <Button
                      size="small"
                      danger
                      loading={busyId === row.id}
                      onClick={async () => {
                        setBusyId(row.id)
                        try {
                          await disconnect()
                          message.success('Disconnected')
                        } finally {
                          setBusyId(null)
                        }
                      }}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="small"
                        type="primary"
                        disabled={!row.hasConfig}
                        loading={busyId === row.id}
                        onClick={() => void openConnect(row, false)}
                      >
                        Connect
                      </Button>
                      <Button
                        size="small"
                        disabled={!row.hasConfig}
                        loading={busyId === row.id}
                        onClick={() => void openConnect(row, true)}
                      >
                        Open externally
                      </Button>
                    </>
                  )}
                  <Button size="small" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                  <Button size="small" onClick={() => void reveal(row.id)}>
                    Reveal file
                  </Button>
                  {row.origin === 'local' && (
                    <Button
                      size="small"
                      danger
                      onClick={async () => {
                        await remove(row.id)
                        message.success('Removed')
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </Space>
              )
            }
          }
        ]}
      />

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
          <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Enter VPN username' }]}>
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
