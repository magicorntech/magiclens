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
import { useSettingsUiStore } from '../stores/settingsUiStore'
import { VpnConnectionPanel } from '../components/Vpn/VpnConnectionPanel'
import { VpnDottedWorldMap } from '../components/Vpn/VpnDottedWorldMap'
import { useTranslation } from 'react-i18next'
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

function serverLabel(row: VpnProfileSummary, noServerLabel: string): string {
  if (row.serverName && row.serverHost) return `${row.serverName} · ${row.serverHost}`
  return row.serverHost || row.serverName || noServerLabel
}

function providerOptions(t: (key: string) => string): { value: string; label: string }[] {
  return [
    { value: 'openvpn', label: t('vpn.draft.providers.openvpn') },
    { value: 'pritunl', label: t('vpn.draft.providers.pritunl') },
    { value: 'wireguard', label: t('vpn.draft.providers.wireguard') },
    { value: 'generic', label: t('vpn.draft.providers.generic') }
  ]
}

export function VpnPage(): React.JSX.Element {
  const { t } = useTranslation()
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
  const openSettings = useSettingsUiStore((s) => s.openSettings)
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
        if (res.ok) message.success(preferExternal ? t('vpn.openedExternalToast') : t('vpn.connectedToast'))
        else message.error(res.error ?? t('vpn.connectFailed'))
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
        label: t('vpn.menu.editProfile'),
        onClick: () => openEdit(row)
      },
      {
        key: 'reveal',
        icon: <Icon icon={FolderOpen} variant="detail" />,
        label: t('vpn.menu.revealFile'),
        onClick: () => void reveal(row.id)
      },
      {
        key: 'external',
        label: t('vpn.menu.openExternally'),
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
        label: t('vpn.menu.delete'),
        onClick: async () => {
          await remove(row.id)
          message.success(t('vpn.removedToast'))
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
                  <span>{t('vpn.heroEyebrow')}</span>
                </div>
              </div>

              <div className={`ml-vpn-status-pill ml-vpn-status-pill--${tone}`}>
                <span className="ml-vpn-status-pill__dot" />
                <div className="ml-vpn-status-pill__text">
                  <strong>
                    {tone === 'connected'
                      ? t('vpn.status.connected')
                      : tone === 'connecting'
                        ? t('vpn.status.connecting')
                        : tone === 'error'
                          ? t('vpn.status.error')
                          : t('vpn.status.disconnected')}
                  </strong>
                  <span>
                    {status?.message ||
                      (connectedIds.size > 1
                        ? t('vpn.tunnelsUp', { count: connectedIds.size })
                        : activeProfile?.name || t('vpn.noActiveProfile'))}
                  </span>
                </div>
                {anyConnected && (
                  <Button
                    size="small"
                    danger
                    icon={<Icon icon={Unplug} variant="action" />}
                    onClick={async () => {
                      await disconnect()
                      message.success(t('vpn.disconnectedToast'))
                    }}
                  >
                    {t('vpn.disconnect')}
                  </Button>
                )}
              </div>
            </header>

            <div className="ml-vpn-page__map-spacer" />

            {tools && !tools.openvpn && !tools.wireguard && !tools.tunnelblick && !tools.wireguardApp && (
              <Alert
                className="ml-vpn-tools-alert"
                type="warning"
                showIcon
                message={t('vpn.noToolsTitle')}
                description={t('vpn.noToolsDesc')}
                action={
                  <Button size="small" type="primary" onClick={() => openSettings('vpnExtensions')}>
                    {t('vpn.openVpnExtensions')}
                  </Button>
                }
              />
            )}

            {status?.status === 'error' && (
              <Alert
                className="ml-vpn-tools-alert"
                type="error"
                showIcon
                message={t('vpn.connectHelpTitle')}
                description={status.message || t('vpn.connectHelpDesc')}
                action={
                  <Button size="small" onClick={() => openSettings('vpnExtensions')}>
                    {t('vpn.openVpnExtensions')}
                  </Button>
                }
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
                  {t('vpn.profilesTitle')}
                </Typography.Title>
                <Typography.Text type="secondary" className="ml-vpn-sidebar__count">
                  {profiles.length === 0
                    ? t('vpn.addToStart')
                    : t('vpn.filteredCount', {
                        filtered: filteredProfiles.length,
                        total: profiles.length
                      })}
                </Typography.Text>
              </div>
            </div>

            <Input
              allowClear
              className="ml-vpn-sidebar__search"
              prefix={<Icon icon={Search} variant="action" />}
              placeholder={t('vpn.searchPlaceholder')}
              value={profileQuery}
              onChange={(e) => setProfileQuery(e.target.value)}
            />

            <div className="ml-vpn-toolbar ml-vpn-toolbar--sidebar">
              <Button
                type="primary"
                icon={<Icon icon={FilePlus2} variant="action" />}
                onClick={() => void startAddFromFile()}
              >
                {t('vpn.addFile')}
              </Button>
              <Button
                icon={<Icon icon={ClipboardPaste} variant="action" />}
                onClick={() => setPasteOpen(true)}
              >
                {t('vpn.paste')}
              </Button>
              <Button
                icon={<Icon icon={RefreshCw} variant="action" />}
                onClick={() => void refresh()}
                loading={loading}
                aria-label={t('vpn.refresh')}
              />
            </div>

            <div className="ml-vpn-sidebar__list">
              {profiles.length === 0 ? (
                <div className="ml-vpn-empty">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('vpn.emptyDesc')}
                  >
                    <Space wrap>
                      <Button type="primary" size="small" onClick={() => void startAddFromFile()}>
                        {t('vpn.chooseFile')}
                      </Button>
                      <Button size="small" onClick={() => setPasteOpen(true)}>
                        {t('vpn.paste')}
                      </Button>
                    </Space>
                  </Empty>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="ml-vpn-empty">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('vpn.noMatch', { query: profileQuery.trim() })}
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
                            {isLive && <Tag color="success">{t('vpn.live')}</Tag>}
                          </div>
                          <Typography.Text type="secondary" className="ml-vpn-profile-card__meta">
                            {row.username || t('vpn.usernameNotSet')} ·{' '}
                            {serverLabel(row, t('vpn.noServerSet'))}
                          </Typography.Text>
                        </div>
                        <Dropdown menu={profileMenu(row)} trigger={['click']}>
                          <Button
                            type="text"
                            className="ml-vpn-profile-card__more"
                            icon={<Icon icon={MoreHorizontal} variant="action" />}
                            aria-label={t('vpn.moreActions')}
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
                                message.success(t('vpn.disconnectedToast'))
                              } finally {
                                setBusyId(null)
                              }
                            }}
                          >
                            {t('vpn.disconnect')}
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            block
                            disabled={!row.hasConfig}
                            loading={busyId === row.id}
                            onClick={() => void openConnect(row, false)}
                          >
                            {t('vpn.connect')}
                          </Button>
                        )}
                        <Button block onClick={() => openEdit(row)}>
                          {t('vpn.edit')}
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
        title={
          draft?.mode === 'edit' ? t('vpn.draft.editTitle') : t('vpn.draft.reviewTitle')
        }
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
          message={t('vpn.draft.correctFields')}
          description={t('vpn.draft.correctFieldsDesc')}
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
                message.error(res.error ?? t('vpn.draft.updateFailed'))
                return
              }
              message.success(t('vpn.draft.updated'))
            } else {
              if (!draft.config) {
                message.error(t('vpn.draft.missingConfig'))
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
              message.success(t('vpn.draft.added'))
            }
            setDraft(null)
          }}
        >
          <Form.Item name="name" label={t('vpn.draft.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {draft?.mode === 'create' && (
            <Form.Item name="provider" label={t('vpn.draft.provider')}>
              <Select options={providerOptions(t)} />
            </Form.Item>
          )}
          <Form.Item
            name="username"
            label={t('vpn.draft.username')}
            rules={[{ required: true, message: t('vpn.draft.usernameRequired') }]}
          >
            <Input placeholder="user@company.com" autoFocus />
          </Form.Item>
          <Form.Item name="organization" label={t('vpn.draft.organization')}>
            <Input placeholder={t('vpn.draft.organizationPlaceholder')} />
          </Form.Item>
          <Form.Item name="serverName" label={t('vpn.draft.serverName')}>
            <Input placeholder="master" />
          </Form.Item>
          <Form.Item name="serverHost" label={t('vpn.draft.serverHost')}>
            <Input placeholder="34.107.68.139" />
          </Form.Item>
          <Form.Item name="protocol" label={t('vpn.draft.protocol')}>
            <Input placeholder={t('vpn.draft.protocolPlaceholder')} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            {draft?.mode === 'edit' ? t('vpn.draft.saveChanges') : t('vpn.draft.saveProfile')}
          </Button>
        </Form>
      </Modal>

      <Modal
        title={t('vpn.auth.title', { name: authProfile?.name ?? '' })}
        open={!!authProfile}
        onCancel={() => setAuthProfile(null)}
        footer={null}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('vpn.auth.pinMfaOnly')}
          description={t('vpn.auth.pinMfaDesc')}
        />
        <div style={{ marginBottom: 16, lineHeight: 1.7 }}>
          <div>
            <Typography.Text type="secondary">{t('vpn.auth.user')} </Typography.Text>
            <Typography.Text strong>
              {authProfile?.username || t('vpn.auth.notSetEdit')}
            </Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">{t('vpn.auth.server')} </Typography.Text>
            <Typography.Text strong>
              {authProfile?.serverName && authProfile?.serverHost
                ? `${authProfile.serverName} (${authProfile.serverHost})`
                : authProfile?.serverHost || authProfile?.serverName || '—'}
            </Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">{t('vpn.auth.organization')} </Typography.Text>
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
              message.error(t('vpn.auth.setUsernameFirst'))
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
                message.success(t('vpn.connectedToast'))
                setAuthProfile(null)
              } else {
                message.error(res.error ?? t('vpn.connectFailed'))
              }
            } finally {
              setBusyId(null)
            }
          }}
        >
          {!authProfile?.username && (
            <Form.Item
              name="username"
              label={t('vpn.draft.username')}
              rules={[{ required: true }]}
            >
              <Input autoFocus placeholder="user@company.com" />
            </Form.Item>
          )}
          <Form.Item
            name="pin"
            label={t('vpn.auth.pin')}
            rules={[{ required: true, message: t('vpn.auth.pinRequired') }]}
          >
            <Input.Password autoFocus={!!authProfile?.username} placeholder={t('vpn.auth.pinPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="mfaCode"
            label={t('vpn.auth.mfa')}
            rules={[{ required: true, message: t('vpn.auth.mfaRequired') }]}
          >
            <Input placeholder={t('vpn.auth.mfaPlaceholder')} inputMode="numeric" autoComplete="one-time-code" />
          </Form.Item>
          <Space style={{ width: '100%' }} direction="vertical">
            <Button type="primary" htmlType="submit" block loading={busyId === authProfile?.id}>
              {t('vpn.connect')}
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
              {t('vpn.auth.editFields')}
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={t('vpn.pasteModal.title')}
        open={pasteOpen}
        onCancel={() => setPasteOpen(false)}
        footer={null}
      >
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
          <Form.Item name="name" label={t('vpn.draft.name')} rules={[{ required: true }]}>
            <Input placeholder={t('vpn.pasteModal.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="provider" label={t('vpn.draft.provider')}>
            <Select options={providerOptions(t)} />
          </Form.Item>
          <Form.Item name="config" label={t('vpn.pasteModal.config')} rules={[{ required: true }]}>
            <Input.TextArea rows={12} placeholder={t('vpn.pasteModal.configPlaceholder')} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            {t('vpn.pasteModal.continue')}
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
