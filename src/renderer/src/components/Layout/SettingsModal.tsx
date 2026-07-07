import { useEffect, useState } from 'react'
import {
  Button,
  ColorPicker,
  Descriptions,
  Menu,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  theme
} from 'antd'
import type { MenuProps } from 'antd'
import type { AggregationColor } from 'antd/es/color-picker/color'
import {
  BgColorsOutlined,
  CheckOutlined,
  CloudDownloadOutlined,
  InfoCircleOutlined,
  LayoutOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { refreshIntervalOptions, useLiveRefreshStore } from '../../stores/liveRefreshStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useUpdateStore } from '../../stores/updateStore'
import { useThemeStore } from '../../stores/themeStore'
import { COLOR_SCHEME_DEFINITIONS } from '../../theme/schemes'
import type { AppInfoResponse } from '@shared/types/app'

type SettingsSection = 'general' | 'updates' | 'display' | 'appearance' | 'about'

const MENU_ITEMS: MenuProps['items'] = [
  { key: 'general', icon: <SyncOutlined />, label: 'General' },
  { key: 'updates', icon: <CloudDownloadOutlined />, label: 'Updates' },
  { key: 'display', icon: <LayoutOutlined />, label: 'Display' },
  { key: 'appearance', icon: <BgColorsOutlined />, label: 'Appearance' },
  { key: 'about', icon: <InfoCircleOutlined />, label: 'About' }
]

const SECTION_TITLES: Record<SettingsSection, string> = {
  general: 'General',
  updates: 'Updates',
  display: 'Display',
  appearance: 'Appearance',
  about: 'About'
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): React.JSX.Element {
  const { token } = theme.useToken()
  const [section, setSection] = useState<SettingsSection>('general')
  const interval = useLiveRefreshStore((s) => s.interval)
  const setInterval_ = useLiveRefreshStore((s) => s.setInterval)
  const colorScheme = useThemeStore((s) => s.colorScheme)
  const setColorScheme = useThemeStore((s) => s.setColorScheme)
  const customAccentColor = useThemeStore((s) => s.customAccentColor)
  const setCustomAccentColor = useThemeStore((s) => s.setCustomAccentColor)
  const [appInfo, setAppInfo] = useState<AppInfoResponse | null>(null)

  const updateSettings = useUpdateStore((s) => s.settings)
  const updateState = useUpdateStore((s) => s.state)
  const saveUpdateSettings = useUpdateStore((s) => s.saveSettings)
  const check = useUpdateStore((s) => s.check)
  const openUpdateCenter = useUpdateStore((s) => s.openCenter)
  const showClusterTabLogos = useDisplaySettingsStore((s) => s.showClusterTabLogos)
  const showResourceTabIcons = useDisplaySettingsStore((s) => s.showResourceTabIcons)
  const resourceDetailPlacement = useDisplaySettingsStore((s) => s.resourceDetailPlacement)
  const setShowClusterTabLogos = useDisplaySettingsStore((s) => s.setShowClusterTabLogos)
  const setShowResourceTabIcons = useDisplaySettingsStore((s) => s.setShowResourceTabIcons)
  const setResourceDetailPlacement = useDisplaySettingsStore((s) => s.setResourceDetailPlacement)
  const showNodesPageEvents = useDisplaySettingsStore((s) => s.showNodesPageEvents)
  const setShowNodesPageEvents = useDisplaySettingsStore((s) => s.setShowNodesPageEvents)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void window.api.app.getInfo().then((info) => {
      if (!cancelled) setAppInfo(info)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  function renderSection(): React.ReactNode {
    switch (section) {
      case 'general':
        return (
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Typography.Text strong>Resource refresh interval</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Select
                  value={interval}
                  onChange={setInterval_}
                  options={refreshIntervalOptions}
                  style={{ width: 200 }}
                />
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                How often resource lists and metrics refresh automatically. Applies to every open cluster tab; pausing
                live refresh is still available per resource view.
              </Typography.Text>
            </div>
          </Space>
        )

      case 'updates':
        return (
          <Space orientation="vertical" style={{ width: '100%' }} size={12}>
            {updateState?.latestVersion && updateState.phase !== 'not-available' && (
              <Tag color="blue">v{updateState.latestVersion} available</Tag>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography.Text>Check for updates automatically</Typography.Text>
              <Switch
                checked={updateSettings?.checkAutomatically ?? true}
                onChange={(checked) => void saveUpdateSettings({ checkAutomatically: checked })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography.Text>Check on startup</Typography.Text>
              <Switch
                checked={updateSettings?.checkOnStartup ?? true}
                onChange={(checked) => void saveUpdateSettings({ checkOnStartup: checked })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography.Text>Include pre-release versions</Typography.Text>
              <Switch
                checked={updateSettings?.includePrerelease ?? false}
                onChange={(checked) => void saveUpdateSettings({ includePrerelease: checked })}
              />
            </div>
            {updateState?.manualDownloadOnly ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Automatic download/install isn't available on macOS without a paid Apple Developer ID certificate. When
                an update is found, MagicLens links out to the GitHub release for a manual DMG download instead.
              </Typography.Text>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>Auto-download updates</Typography.Text>
                  <Switch
                    checked={updateSettings?.autoDownload ?? false}
                    onChange={(checked) => void saveUpdateSettings({ autoDownload: checked })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>Ask before install</Typography.Text>
                  <Switch
                    checked={updateSettings?.askBeforeInstall ?? true}
                    onChange={(checked) => void saveUpdateSettings({ askBeforeInstall: checked })}
                  />
                </div>
              </>
            )}
            <Space style={{ marginTop: 4 }}>
              <Button
                size="small"
                icon={<SyncOutlined />}
                loading={updateState?.phase === 'checking'}
                onClick={() => void check()}
              >
                Check for updates now
              </Button>
              <Button size="small" onClick={() => openUpdateCenter()}>
                Open Update Center
              </Button>
            </Space>
          </Space>
        )

      case 'display':
        return (
          <Space orientation="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Typography.Text strong>Resource details</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Select
                  value={resourceDetailPlacement}
                  onChange={(value) => void setResourceDetailPlacement(value)}
                  options={[
                    { value: 'right', label: 'Right panel (split view)' },
                    { value: 'bottom', label: 'Bottom tab' }
                  ]}
                  style={{ width: '100%', maxWidth: 360 }}
                />
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                Choose whether clicking a resource opens its detail view in a right-side panel or as a tab in the
                bottom dock (alongside Terminal and YAML editor).
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong>Nodes page</Typography.Text>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <Typography.Text>Show events panel</Typography.Text>
                <Switch checked={showNodesPageEvents} onChange={(checked) => void setShowNodesPageEvents(checked)} />
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                When enabled, the Nodes view shows a collapsible events panel at the bottom. You can collapse it with
                the button on the panel header.
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong>Tab icons</Typography.Text>
              <Space orientation="vertical" style={{ width: '100%', marginTop: 8 }} size={8}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>Show logos on cluster tabs</Typography.Text>
                  <Switch checked={showClusterTabLogos} onChange={(checked) => void setShowClusterTabLogos(checked)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>Show icons on resource tabs</Typography.Text>
                  <Switch
                    checked={showResourceTabIcons}
                    onChange={(checked) => void setShowResourceTabIcons(checked)}
                  />
                </div>
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                Cluster tabs use the cluster logo you set when adding a cluster. Resource tabs use the same icons as
                the left menu.
              </Typography.Text>
            </div>
          </Space>
        )

      case 'appearance':
        return (
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Pick a preset or choose your own accent color. Sidebar, resource menu, and panels all follow the active
              theme. Use the header toggle for light / dark mode.
            </Typography.Text>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 10
              }}
            >
              {COLOR_SCHEME_DEFINITIONS.map((scheme) => {
                const selected = colorScheme === scheme.id
                return (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() => setColorScheme(scheme.id)}
                    style={{
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 10,
                      borderRadius: token.borderRadius,
                      border: selected ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`,
                      background: token.colorBgContainer,
                      boxShadow: selected ? token.boxShadowSecondary : undefined
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                      {scheme.swatches.map((color) => (
                        <span
                          key={color}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: color,
                            border: `1px solid ${token.colorBorderSecondary}`
                          }}
                        />
                      ))}
                    </div>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      {scheme.name}
                      {selected ? <CheckOutlined style={{ marginLeft: 6, color: token.colorPrimary }} /> : null}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                      {scheme.description}
                    </Typography.Text>
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setColorScheme('custom')}
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 10,
                  borderRadius: token.borderRadius,
                  border:
                    colorScheme === 'custom'
                      ? `2px solid ${token.colorPrimary}`
                      : `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorBgContainer,
                  boxShadow: colorScheme === 'custom' ? token.boxShadowSecondary : undefined
                }}
              >
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: customAccentColor,
                      border: `1px solid ${token.colorBorderSecondary}`
                    }}
                  />
                  <BgColorsOutlined style={{ color: token.colorTextSecondary, fontSize: 14 }} />
                </div>
                <Typography.Text strong style={{ fontSize: 13 }}>
                  Custom
                  {colorScheme === 'custom' ? (
                    <CheckOutlined style={{ marginLeft: 6, color: token.colorPrimary }} />
                  ) : null}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  Your own accent color
                </Typography.Text>
              </button>
            </div>
            <div
              style={{
                padding: 12,
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgSpotlight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div>
                <Typography.Text strong style={{ display: 'block' }}>
                  Custom accent
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Applies to sidebars, buttons, highlights, and chart accents.
                </Typography.Text>
              </div>
              <ColorPicker
                value={customAccentColor}
                showText
                onChange={(color: AggregationColor) => setCustomAccentColor(color.toHexString())}
              />
            </div>
          </Space>
        )

      case 'about':
        return (
          <Descriptions size="small" column={1} bordered style={{ maxWidth: 400 }}>
            <Descriptions.Item label="Version">{appInfo?.version ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Build">{appInfo?.buildNumber ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Electron">{appInfo?.electronVersion ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Chromium">{appInfo?.chromeVersion ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Node.js">{appInfo?.nodeVersion ?? '-'}</Descriptions.Item>
          </Descriptions>
        )
    }
  }

  return (
    <Modal
      title="Settings"
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', minHeight: 400 }}>
        <Menu
          mode="inline"
          selectedKeys={[section]}
          items={MENU_ITEMS}
          onClick={({ key }) => setSection(key as SettingsSection)}
          style={{
            width: 168,
            flexShrink: 0,
            borderInlineEnd: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: 0,
            padding: '8px 0'
          }}
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: '20px 24px',
            overflow: 'auto',
            maxHeight: 'min(70vh, 520px)'
          }}
        >
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
            {SECTION_TITLES[section]}
          </Typography.Title>
          {renderSection()}
        </div>
      </div>
    </Modal>
  )
}
