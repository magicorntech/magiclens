import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  ColorPicker,
  Descriptions,
  Input,
  Menu,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
  theme
} from 'antd'
import type { MenuProps } from 'antd'
import type { AggregationColor } from 'antd/es/color-picker/color'
import {
  Check,
  CloudDownload,
  Code2,
  Info,
  Keyboard,
  LayoutDashboard,
  Layers2,
  Network,
  Palette,
  RefreshCw
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import { refreshIntervalOptions, useLiveRefreshStore } from '../../stores/liveRefreshStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useUpdateStore } from '../../stores/updateStore'
import { useThemeStore } from '../../stores/themeStore'
import { COLOR_SCHEME_DEFINITIONS } from '../../theme/schemes'
import type { AppInfoResponse } from '@shared/types/app'
import { APP_LOCALES, APP_LOCALE_LABELS, type AppLocale } from '@shared/types/locale'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import { applyDedupeResult } from '../../clusterDedupe'
import { NodesDashboardSettings } from '../Nodes/NodesDashboardSettings'
import { KeyboardShortcutsSettings } from './KeyboardShortcutsSettings'
import { VpnExtensionsSettings } from './VpnExtensionsSettings'
import { DeveloperSettings } from './DeveloperSettings'
import { type SettingsSection, useSettingsUiStore } from '../../stores/settingsUiStore'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const layoutMode = useLayoutMode()
  const isMobileSettings = layoutMode === 'mobile'
  const modalWidth = layoutMode === 'mobile' ? 'calc(100vw - 16px)' : layoutMode === 'compact' ? 560 : 760
  const section = useSettingsUiStore((s) => s.section)
  const setSection = useSettingsUiStore((s) => s.setSection)
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
  const showFavoritesSection = useDisplaySettingsStore((s) => s.showFavoritesSection)
  const showWorkspacesSection = useDisplaySettingsStore((s) => s.showWorkspacesSection)
  const resourceDetailPlacement = useDisplaySettingsStore((s) => s.resourceDetailPlacement)
  const locale = useDisplaySettingsStore((s) => s.locale)
  const kubeconfigScanPath = useDisplaySettingsStore((s) => s.kubeconfigScanPath)
  const setShowClusterTabLogos = useDisplaySettingsStore((s) => s.setShowClusterTabLogos)
  const setShowResourceTabIcons = useDisplaySettingsStore((s) => s.setShowResourceTabIcons)
  const setShowFavoritesSection = useDisplaySettingsStore((s) => s.setShowFavoritesSection)
  const setShowWorkspacesSection = useDisplaySettingsStore((s) => s.setShowWorkspacesSection)
  const setResourceDetailPlacement = useDisplaySettingsStore((s) => s.setResourceDetailPlacement)
  const setLocale = useDisplaySettingsStore((s) => s.setLocale)
  const setKubeconfigScanPath = useDisplaySettingsStore((s) => s.setKubeconfigScanPath)
  const [kubePathDraft, setKubePathDraft] = useState(kubeconfigScanPath)
  const [deduping, setDeduping] = useState(false)

  useEffect(() => {
    if (open) setKubePathDraft(kubeconfigScanPath)
  }, [open, kubeconfigScanPath])

  function handleDedupeClusters(): void {
    Modal.confirm({
      title: t('settings.general.dedupeConfirmTitle'),
      content: t('settings.general.dedupeConfirmBody'),
      okText: t('settings.general.dedupeConfirmOk'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        setDeduping(true)
        try {
          const result = await window.api.clusterStore.dedupe()
          applyDedupeResult(result)
          if (result.groupsMerged === 0) {
            message.info(t('settings.general.dedupeNone'))
          } else {
            message.success(
              t('settings.general.dedupeDone', {
                groups: result.groupsMerged,
                removed: result.removedIds.length,
                kept: result.kept
              })
            )
          }
        } catch (err) {
          message.error(err instanceof Error ? err.message : String(err))
        } finally {
          setDeduping(false)
        }
      }
    })
  }

  const menuItems: MenuProps['items'] = useMemo(
    () => [
      { key: 'general', icon: <Icon icon={RefreshCw} variant="detail" />, label: t('settings.sections.general') },
      { key: 'updates', icon: <Icon icon={CloudDownload} variant="detail" />, label: t('settings.sections.updates') },
      { key: 'display', icon: <Icon icon={LayoutDashboard} variant="detail" />, label: t('settings.sections.display') },
      {
        key: 'vpnExtensions',
        icon: <Icon icon={Network} variant="detail" />,
        label: t('settings.sections.vpnExtensions')
      },
      { key: 'keyboard', icon: <Icon icon={Keyboard} variant="detail" />, label: t('settings.sections.keyboard') },
      { key: 'appearance', icon: <Icon icon={Palette} variant="detail" />, label: t('settings.sections.appearance') },
      { key: 'developer', icon: <Icon icon={Code2} variant="detail" />, label: t('settings.sections.developer') },
      { key: 'about', icon: <Icon icon={Info} variant="detail" />, label: t('settings.sections.about') }
    ],
    [t]
  )

  const intervalOptions = useMemo(
    () =>
      refreshIntervalOptions.map((opt) => ({
        ...opt,
        label: opt.value === 'manual' ? t('common.manual') : opt.label
      })),
    [t]
  )

  const languageOptions = useMemo(
    () => APP_LOCALES.map((code) => ({ value: code, label: APP_LOCALE_LABELS[code] })),
    []
  )

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
              <Typography.Text strong>{t('settings.language.title')}</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Select
                  value={locale}
                  onChange={(value: AppLocale) => void setLocale(value)}
                  options={languageOptions}
                  style={{ width: 240 }}
                />
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {t('settings.language.hint')}
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong>{t('settings.general.refreshTitle')}</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Select
                  value={interval}
                  onChange={setInterval_}
                  options={intervalOptions}
                  style={{ width: 200 }}
                />
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {t('settings.general.refreshHint')}
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong>{t('settings.general.kubeconfigPathTitle')}</Typography.Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Input
                  value={kubePathDraft}
                  placeholder={t('settings.general.kubeconfigPathPlaceholder')}
                  onChange={(e) => setKubePathDraft(e.target.value)}
                  onBlur={() => {
                    if (kubePathDraft !== kubeconfigScanPath) void setKubeconfigScanPath(kubePathDraft)
                  }}
                  style={{ flex: 1, minWidth: 220 }}
                />
                <Button
                  onClick={() => {
                    void window.api.kubeconfig.pickFile().then((r) => {
                      if (!r.canceled && r.filePath) {
                        setKubePathDraft(r.filePath)
                        void setKubeconfigScanPath(r.filePath)
                      }
                    })
                  }}
                >
                  {t('settings.general.kubeconfigPickFile')}
                </Button>
                <Button
                  onClick={() => {
                    void window.api.kubeconfig.pickDirectory().then((r) => {
                      if (!r.canceled && r.directoryPath) {
                        setKubePathDraft(r.directoryPath)
                        void setKubeconfigScanPath(r.directoryPath)
                      }
                    })
                  }}
                >
                  {t('settings.general.kubeconfigPickFolder')}
                </Button>
                <Button
                  onClick={() => {
                    setKubePathDraft('')
                    void setKubeconfigScanPath('')
                  }}
                >
                  {t('settings.general.kubeconfigReset')}
                </Button>
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {t('settings.general.kubeconfigPathHint')}
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong>{t('settings.general.dedupeTitle')}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {t('settings.general.dedupeHint')}
              </Typography.Text>
              <div style={{ marginTop: 12 }}>
                <Button
                  icon={<Icon icon={Layers2} variant="detail" />}
                  loading={deduping}
                  onClick={handleDedupeClusters}
                >
                  {t('settings.general.dedupe')}
                </Button>
              </div>
            </div>
          </Space>
        )

      case 'updates':
        return (
          <Space orientation="vertical" style={{ width: '100%' }} size={12}>
            {updateState?.latestVersion && updateState.phase !== 'not-available' && (
              <Tag color="blue">{t('settings.updates.available', { version: updateState.latestVersion })}</Tag>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography.Text>{t('settings.updates.checkAutomatically')}</Typography.Text>
              <Switch
                checked={updateSettings?.checkAutomatically ?? true}
                onChange={(checked) => void saveUpdateSettings({ checkAutomatically: checked })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography.Text>{t('settings.updates.checkOnStartup')}</Typography.Text>
              <Switch
                checked={updateSettings?.checkOnStartup ?? true}
                onChange={(checked) => void saveUpdateSettings({ checkOnStartup: checked })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography.Text>{t('settings.updates.includePrerelease')}</Typography.Text>
              <Switch
                checked={updateSettings?.includePrerelease ?? false}
                onChange={(checked) => void saveUpdateSettings({ includePrerelease: checked })}
              />
            </div>
            {updateState?.manualDownloadOnly ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('settings.updates.macosManual')}
              </Typography.Text>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>{t('settings.updates.autoDownload')}</Typography.Text>
                  <Switch
                    checked={updateSettings?.autoDownload ?? false}
                    onChange={(checked) => void saveUpdateSettings({ autoDownload: checked })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>{t('settings.updates.askBeforeInstall')}</Typography.Text>
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
                icon={<Icon icon={RefreshCw} variant="detail" />}
                loading={updateState?.phase === 'checking'}
                onClick={() => void check()}
              >
                {t('settings.updates.checkNow')}
              </Button>
              <Button size="small" onClick={() => openUpdateCenter()}>
                {t('settings.updates.openCenter')}
              </Button>
            </Space>
          </Space>
        )

      case 'display':
        return (
          <Space orientation="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Typography.Text strong>{t('settings.display.detailsTitle')}</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Select
                  value={resourceDetailPlacement}
                  onChange={(value) => void setResourceDetailPlacement(value)}
                  options={[
                    { value: 'drawer', label: t('settings.display.placementDrawer') },
                    { value: 'right', label: t('settings.display.placementRight') },
                    { value: 'bottom', label: t('settings.display.placementBottom') }
                  ]}
                  style={{ width: '100%', maxWidth: 360 }}
                />
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {t('settings.display.detailsHint')}
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong>{t('settings.display.nodesTitle')}</Typography.Text>
              <div style={{ marginTop: 10 }}>
                <NodesDashboardSettings />
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {t('settings.display.nodesHint')}
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong>{t('settings.display.sidebarTitle')}</Typography.Text>
              <Space orientation="vertical" style={{ width: '100%', marginTop: 8 }} size={8}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>{t('settings.display.showFavorites')}</Typography.Text>
                  <Switch
                    checked={showFavoritesSection}
                    onChange={(checked) => void setShowFavoritesSection(checked)}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>{t('settings.display.showWorkspaces')}</Typography.Text>
                  <Switch
                    checked={showWorkspacesSection}
                    onChange={(checked) => void setShowWorkspacesSection(checked)}
                  />
                </div>
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {t('settings.display.showFavoritesHint')} {t('settings.display.showWorkspacesHint')}
              </Typography.Text>
            </div>
            <div>
              <Typography.Text strong>{t('settings.display.tabIconsTitle')}</Typography.Text>
              <Space orientation="vertical" style={{ width: '100%', marginTop: 8 }} size={8}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>{t('settings.display.showClusterLogos')}</Typography.Text>
                  <Switch checked={showClusterTabLogos} onChange={(checked) => void setShowClusterTabLogos(checked)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>{t('settings.display.showResourceIcons')}</Typography.Text>
                  <Switch
                    checked={showResourceTabIcons}
                    onChange={(checked) => void setShowResourceTabIcons(checked)}
                  />
                </div>
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                {t('settings.display.tabIconsHint')}
              </Typography.Text>
            </div>
          </Space>
        )

      case 'keyboard':
        return <KeyboardShortcutsSettings />

      case 'appearance':
        return (
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('settings.appearance.intro')}
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
                      {selected ? <Icon icon={Check} variant="detail" style={{ marginLeft: 6, color: token.colorPrimary }} /> : null}
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
                  <Icon icon={Palette} variant="detail" style={{ color: token.colorTextSecondary }} />
                </div>
                <Typography.Text strong style={{ fontSize: 13 }}>
                  {t('common.custom')}
                  {colorScheme === 'custom' ? (
                    <Icon icon={Check} variant="detail" style={{ marginLeft: 6, color: token.colorPrimary }} />
                  ) : null}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {t('settings.appearance.customSwatch')}
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
                  {t('settings.appearance.customAccent')}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('settings.appearance.customAccentHint')}
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

      case 'vpnExtensions':
        return <VpnExtensionsSettings />

      case 'developer':
        return <DeveloperSettings />

      case 'about':
        return (
          <Descriptions size="small" column={1} bordered style={{ maxWidth: 400 }}>
            <Descriptions.Item label={t('common.version')}>{appInfo?.version ?? '-'}</Descriptions.Item>
            <Descriptions.Item label={t('common.build')}>{appInfo?.buildNumber ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Electron">{appInfo?.electronVersion ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Chromium">{appInfo?.chromeVersion ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Node.js">{appInfo?.nodeVersion ?? '-'}</Descriptions.Item>
            <Descriptions.Item label={t('settings.about.platform')}>
              {appInfo?.platform ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        )
    }
  }

  return (
    <Modal
      title={t('settings.title')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={modalWidth}
      destroyOnHidden
      className="settings-modal"
      centered={!isMobileSettings}
      styles={{ body: { padding: 0 } }}
    >
      <div className={`settings-modal-body${isMobileSettings ? ' settings-modal-body--mobile' : ''}`}>
        <Menu
          mode={isMobileSettings ? 'horizontal' : 'inline'}
          selectedKeys={[section]}
          items={menuItems}
          onClick={({ key }) => setSection(key as SettingsSection)}
          className="settings-modal-menu"
          style={
            isMobileSettings
              ? {
                  width: '100%',
                  flexShrink: 0,
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 0,
                  overflowX: 'auto'
                }
              : {
                  width: 168,
                  flexShrink: 0,
                  borderInlineEnd: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 0,
                  padding: '8px 0'
                }
          }
        />
        <div className="settings-modal-content">
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>
            {t(`settings.sections.${section}`)}
          </Typography.Title>
          {renderSection()}
        </div>
      </div>
    </Modal>
  )
}
