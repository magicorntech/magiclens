import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  ColorPicker,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  message
} from 'antd'
import type { AggregationColor } from 'antd/es/color-picker/color'
import type { LucideIcon } from 'lucide-react'
import {
  CloudDownload,
  Code2,
  FolderOpen,
  Info,
  Keyboard,
  LayoutDashboard,
  Layers2,
  Network,
  Palette,
  RefreshCw,
  Settings2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import logo from '../../assets/logo.png'
import { refreshIntervalOptions, useLiveRefreshStore } from '../../stores/liveRefreshStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useUpdateStore } from '../../stores/updateStore'
import { useThemeStore } from '../../stores/themeStore'
import { COLOR_SCHEME_DEFINITIONS, COLOR_SCHEME_GROUPS } from '../../theme/schemes'
import type { AppInfoResponse } from '@shared/types/app'
import { APP_LOCALES, APP_LOCALE_LABELS, type AppLocale } from '@shared/types/locale'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import { applyDedupeResult } from '../../clusterDedupe'
import { NodesDashboardSettings } from '../Nodes/NodesDashboardSettings'
import { KeyboardShortcutsSettings } from './KeyboardShortcutsSettings'
import { VpnExtensionsSettings } from './VpnExtensionsSettings'
import { DeveloperSettings } from './DeveloperSettings'
import { ThemeToggle } from './ThemeToggle'
import {
  SettingsSection,
  SettingsToggleRow,
  ThemeSchemeCard
} from './SettingsPrimitives'
import { type SettingsSection as SettingsSectionId, useSettingsUiStore } from '../../stores/settingsUiStore'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

interface NavItem {
  key: SettingsSectionId
  icon: LucideIcon
  group: 'preferences' | 'system'
}

const NAV_ITEMS: NavItem[] = [
  { key: 'general', icon: Settings2, group: 'preferences' },
  { key: 'appearance', icon: Palette, group: 'preferences' },
  { key: 'display', icon: LayoutDashboard, group: 'preferences' },
  { key: 'keyboard', icon: Keyboard, group: 'preferences' },
  { key: 'updates', icon: CloudDownload, group: 'system' },
  { key: 'vpnExtensions', icon: Network, group: 'system' },
  { key: 'developer', icon: Code2, group: 'system' },
  { key: 'about', icon: Info, group: 'system' }
]

export function SettingsModal({ open, onClose }: SettingsModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const layoutMode = useLayoutMode()
  const isMobileSettings = layoutMode === 'mobile'
  const modalWidth =
    layoutMode === 'mobile' ? 'calc(100vw - 12px)' : layoutMode === 'compact' ? 860 : 1100
  const modalHeight =
    layoutMode === 'mobile' ? 'calc(100vh - 24px)' : layoutMode === 'compact' ? 620 : 680
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
  const showClusterNamespace = useDisplaySettingsStore((s) => s.showClusterNamespace)
  const resourceDetailPlacement = useDisplaySettingsStore((s) => s.resourceDetailPlacement)
  const resourceDetailMaskBlur = useDisplaySettingsStore((s) => s.resourceDetailMaskBlur)
  const utilityPanelPlacement = useDisplaySettingsStore((s) => s.utilityPanelPlacement)
  const locale = useDisplaySettingsStore((s) => s.locale)
  const kubeconfigScanPath = useDisplaySettingsStore((s) => s.kubeconfigScanPath)
  const setShowClusterTabLogos = useDisplaySettingsStore((s) => s.setShowClusterTabLogos)
  const setShowResourceTabIcons = useDisplaySettingsStore((s) => s.setShowResourceTabIcons)
  const setShowFavoritesSection = useDisplaySettingsStore((s) => s.setShowFavoritesSection)
  const setShowWorkspacesSection = useDisplaySettingsStore((s) => s.setShowWorkspacesSection)
  const setShowClusterNamespace = useDisplaySettingsStore((s) => s.setShowClusterNamespace)
  const setResourceDetailPlacement = useDisplaySettingsStore((s) => s.setResourceDetailPlacement)
  const setResourceDetailMaskBlur = useDisplaySettingsStore((s) => s.setResourceDetailMaskBlur)
  const setUtilityPanelPlacement = useDisplaySettingsStore((s) => s.setUtilityPanelPlacement)
  const setLocale = useDisplaySettingsStore((s) => s.setLocale)
  const setKubeconfigScanPath = useDisplaySettingsStore((s) => s.setKubeconfigScanPath)
  const [kubePathDraft, setKubePathDraft] = useState(kubeconfigScanPath)
  const [deduping, setDeduping] = useState(false)

  useEffect(() => {
    if (open) setKubePathDraft(kubeconfigScanPath)
  }, [open, kubeconfigScanPath])

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

  const preferenceNav = NAV_ITEMS.filter((i) => i.group === 'preferences')
  const systemNav = NAV_ITEMS.filter((i) => i.group === 'system')

  function renderNavGroup(items: NavItem[], label: string): React.JSX.Element {
    return (
      <div className="ml-settings-nav__group">
        {!isMobileSettings ? <div className="ml-settings-nav__group-label">{label}</div> : null}
        <div className="ml-settings-nav__list" role="tablist" aria-orientation={isMobileSettings ? 'horizontal' : 'vertical'}>
          {items.map((item) => {
            const active = section === item.key
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`ml-settings-nav__item${active ? ' is-active' : ''}`}
                onClick={() => setSection(item.key)}
              >
                <Icon icon={item.icon} variant="detail" />
                <span>{t(`settings.sections.${item.key}`)}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderSection(): React.ReactNode {
    switch (section) {
      case 'general':
        return (
          <>
            <SettingsSection title={t('settings.language.title')} description={t('settings.language.hint')}>
              <div className="ml-settings-segmented-wrap">
                <Select
                  value={locale}
                  onChange={(value: AppLocale) => void setLocale(value)}
                  options={languageOptions}
                  style={{ width: 260, maxWidth: '100%' }}
                />
              </div>
            </SettingsSection>

            <SettingsSection
              title={t('settings.general.refreshTitle')}
              description={t('settings.general.refreshHint')}
            >
              <div className="ml-settings-segmented-wrap">
                <Select
                  value={interval}
                  onChange={setInterval_}
                  options={intervalOptions}
                  style={{ width: 220, maxWidth: '100%' }}
                />
              </div>
            </SettingsSection>

            <SettingsSection
              title={t('settings.general.kubeconfigPathTitle')}
              description={t('settings.general.kubeconfigPathHint')}
            >
              <div className="ml-settings-path-row">
                <Input
                  value={kubePathDraft}
                  placeholder={t('settings.general.kubeconfigPathPlaceholder')}
                  onChange={(e) => setKubePathDraft(e.target.value)}
                  onBlur={() => {
                    if (kubePathDraft !== kubeconfigScanPath) void setKubeconfigScanPath(kubePathDraft)
                  }}
                  className="ml-settings-path-row__input"
                />
                <Button
                  icon={<Icon icon={FolderOpen} variant="detail" />}
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
                  type="text"
                  onClick={() => {
                    setKubePathDraft('')
                    void setKubeconfigScanPath('')
                  }}
                >
                  {t('settings.general.kubeconfigReset')}
                </Button>
              </div>
            </SettingsSection>

            <SettingsSection
              title={t('settings.general.dedupeTitle')}
              description={t('settings.general.dedupeHint')}
              actions={
                <Button
                  icon={<Icon icon={Layers2} variant="detail" />}
                  loading={deduping}
                  onClick={handleDedupeClusters}
                >
                  {t('settings.general.dedupe')}
                </Button>
              }
            >
              <Typography.Text type="secondary" className="ml-settings-inline-hint">
                {t('settings.general.dedupeConfirmBody')}
              </Typography.Text>
            </SettingsSection>
          </>
        )

      case 'updates':
        return (
          <>
            <SettingsSection
              title={t('settings.sections.updates')}
              description={t('settings.sectionHints.updates')}
              actions={
                <Space size={8}>
                  {updateState?.latestVersion && updateState.phase !== 'not-available' ? (
                    <Tag color="blue">
                      {t('settings.updates.available', { version: updateState.latestVersion })}
                    </Tag>
                  ) : null}
                  <Button
                    size="small"
                    icon={<Icon icon={RefreshCw} variant="detail" />}
                    loading={updateState?.phase === 'checking'}
                    onClick={() => void check()}
                  >
                    {t('settings.updates.checkNow')}
                  </Button>
                  <Button size="small" type="primary" ghost onClick={() => openUpdateCenter()}>
                    {t('settings.updates.openCenter')}
                  </Button>
                </Space>
              }
            >
              <SettingsToggleRow
                title={t('settings.updates.checkAutomatically')}
                checked={updateSettings?.checkAutomatically ?? true}
                onChange={(checked) => void saveUpdateSettings({ checkAutomatically: checked })}
              />
              <SettingsToggleRow
                title={t('settings.updates.checkOnStartup')}
                checked={updateSettings?.checkOnStartup ?? true}
                onChange={(checked) => void saveUpdateSettings({ checkOnStartup: checked })}
              />
              <SettingsToggleRow
                title={t('settings.updates.includePrerelease')}
                checked={updateSettings?.includePrerelease ?? false}
                onChange={(checked) => void saveUpdateSettings({ includePrerelease: checked })}
              />
              {updateState?.manualDownloadOnly ? (
                <Typography.Text type="secondary" className="ml-settings-inline-hint">
                  {t('settings.updates.macosManual')}
                </Typography.Text>
              ) : (
                <>
                  <SettingsToggleRow
                    title={t('settings.updates.autoDownload')}
                    checked={updateSettings?.autoDownload ?? false}
                    onChange={(checked) => void saveUpdateSettings({ autoDownload: checked })}
                  />
                  <SettingsToggleRow
                    title={t('settings.updates.askBeforeInstall')}
                    checked={updateSettings?.askBeforeInstall ?? true}
                    onChange={(checked) => void saveUpdateSettings({ askBeforeInstall: checked })}
                  />
                </>
              )}
            </SettingsSection>
          </>
        )

      case 'display':
        return (
          <>
            <SettingsSection
              title={t('settings.display.detailsTitle')}
              description={t('settings.display.detailsHint')}
            >
              <div className="ml-settings-segmented-wrap">
                <Segmented
                  block
                  value={resourceDetailPlacement}
                  onChange={(value) => void setResourceDetailPlacement(value as typeof resourceDetailPlacement)}
                  options={[
                    { value: 'drawer', label: t('settings.display.placementDrawer') },
                    { value: 'right', label: t('settings.display.placementRight') },
                    { value: 'bottom', label: t('settings.display.placementBottom') }
                  ]}
                />
              </div>
              <SettingsToggleRow
                title={t('settings.display.detailMaskBlur')}
                description={t('settings.display.detailMaskBlurHint')}
                checked={resourceDetailMaskBlur}
                onChange={(checked) => void setResourceDetailMaskBlur(checked)}
              />
            </SettingsSection>

            <SettingsSection
              title={t('settings.display.panelTitle')}
              description={t('settings.display.panelHint')}
            >
              <div className="ml-settings-segmented-wrap">
                <Segmented
                  block
                  value={utilityPanelPlacement}
                  onChange={(value) => void setUtilityPanelPlacement(value as typeof utilityPanelPlacement)}
                  options={[
                    { value: 'bottom', label: t('settings.display.panelPlacementBottom') },
                    { value: 'right', label: t('settings.display.panelPlacementRight') },
                    { value: 'left', label: t('settings.display.panelPlacementLeft') }
                  ]}
                />
              </div>
            </SettingsSection>

            <SettingsSection
              title={t('settings.display.sidebarTitle')}
              description={t('settings.display.showFavoritesHint')}
            >
              <SettingsToggleRow
                title={t('settings.display.showFavorites')}
                description={t('settings.display.showFavoritesHint')}
                checked={showFavoritesSection}
                onChange={(checked) => void setShowFavoritesSection(checked)}
              />
              <SettingsToggleRow
                title={t('settings.display.showWorkspaces')}
                description={t('settings.display.showWorkspacesHint')}
                checked={showWorkspacesSection}
                onChange={(checked) => void setShowWorkspacesSection(checked)}
              />
              <SettingsToggleRow
                title={t('settings.display.showClusterNamespace')}
                description={t('settings.display.showClusterNamespaceHint')}
                checked={showClusterNamespace}
                onChange={(checked) => void setShowClusterNamespace(checked)}
              />
            </SettingsSection>

            <SettingsSection
              title={t('settings.display.tabIconsTitle')}
              description={t('settings.display.tabIconsHint')}
            >
              <SettingsToggleRow
                title={t('settings.display.showClusterLogos')}
                checked={showClusterTabLogos}
                onChange={(checked) => void setShowClusterTabLogos(checked)}
              />
              <SettingsToggleRow
                title={t('settings.display.showResourceIcons')}
                checked={showResourceTabIcons}
                onChange={(checked) => void setShowResourceTabIcons(checked)}
              />
            </SettingsSection>

            <SettingsSection
              title={t('settings.display.nodesTitle')}
              description={t('settings.display.nodesHint')}
            >
              <NodesDashboardSettings />
            </SettingsSection>
          </>
        )

      case 'keyboard':
        return <KeyboardShortcutsSettings />

      case 'appearance':
        return (
          <>
            <SettingsSection
              title={t('settings.appearance.modeTitle')}
              description={t('settings.appearance.modeHint')}
            >
              <div className="ml-settings-theme-mode">
                <ThemeToggle />
              </div>
            </SettingsSection>

            <SettingsSection
              title={t('settings.sections.appearance')}
              description={t('settings.appearance.intro')}
            >
              {COLOR_SCHEME_GROUPS.map((group) => {
                const schemes = COLOR_SCHEME_DEFINITIONS.filter((s) => s.group === group.id)
                return (
                  <div key={group.id} className="ml-settings-theme-group">
                    <div className="ml-settings-theme-group__label">{t(group.labelKey)}</div>
                    <div className="ml-settings-theme-grid">
                      {schemes.map((scheme) => (
                        <ThemeSchemeCard
                          key={scheme.id}
                          name={scheme.name}
                          description={scheme.description}
                          swatches={scheme.swatches}
                          selected={colorScheme === scheme.id}
                          onSelect={() => setColorScheme(scheme.id)}
                        />
                      ))}
                      {group.id === 'classic' ? (
                        <ThemeSchemeCard
                          name={t('common.custom')}
                          description={t('settings.appearance.customSwatch')}
                          swatches={[customAccentColor]}
                          selected={colorScheme === 'custom'}
                          onSelect={() => setColorScheme('custom')}
                          trailing={<Icon icon={Palette} variant="detail" />}
                        />
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </SettingsSection>

            <SettingsSection
              title={t('settings.appearance.customAccent')}
              description={t('settings.appearance.customAccentHint')}
            >
              <div className="ml-settings-theme-mode">
                <ColorPicker
                  value={customAccentColor}
                  showText
                  onChange={(color: AggregationColor) => setCustomAccentColor(color.toHexString())}
                />
              </div>
            </SettingsSection>
          </>
        )

      case 'vpnExtensions':
        return <VpnExtensionsSettings />

      case 'developer':
        return <DeveloperSettings />

      case 'about':
        return (
          <SettingsSection title={t('settings.about.appTitle')} description={t('settings.about.appHint')}>
            <div className="ml-settings-about">
              <div className="ml-settings-about__brand">
                <img src={logo} alt="" className="ml-settings-about__logo" width={56} height={56} />
                <div>
                  <div className="ml-settings-about__name">MagicLens</div>
                  <div className="ml-settings-about__version">
                    {t('common.version')} {appInfo?.version ?? '—'}
                    {appInfo?.buildNumber ? ` · ${t('common.build')} ${appInfo.buildNumber}` : ''}
                  </div>
                </div>
              </div>
              <dl className="ml-settings-about__meta">
                <div>
                  <dt>Electron</dt>
                  <dd>{appInfo?.electronVersion ?? '—'}</dd>
                </div>
                <div>
                  <dt>Chromium</dt>
                  <dd>{appInfo?.chromeVersion ?? '—'}</dd>
                </div>
                <div>
                  <dt>Node.js</dt>
                  <dd>{appInfo?.nodeVersion ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('settings.about.platform')}</dt>
                  <dd>{appInfo?.platform ?? '—'}</dd>
                </div>
              </dl>
            </div>
          </SettingsSection>
        )
    }
  }

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width={modalWidth}
      destroyOnHidden
      className="ml-settings-modal"
      rootClassName="ml-settings-modal-root"
      centered={!isMobileSettings}
      styles={{
        container: {
          height: modalHeight,
          maxHeight: modalHeight,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        },
        body: {
          flex: 1,
          minHeight: 0,
          height: '100%',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <div className={`ml-settings${isMobileSettings ? ' ml-settings--mobile' : ''}`}>
        <aside className="ml-settings-nav" aria-label={t('settings.title')}>
          <div className="ml-settings-nav__brand">
            <Icon icon={Settings2} variant="toolbar" />
            <div>
              <div className="ml-settings-nav__brand-title">{t('settings.title')}</div>
              {!isMobileSettings ? (
                <div className="ml-settings-nav__brand-hint">{t('settings.subtitle')}</div>
              ) : null}
            </div>
          </div>
          {renderNavGroup(preferenceNav, t('settings.navGroups.preferences'))}
          {renderNavGroup(systemNav, t('settings.navGroups.system'))}
        </aside>

        <div className="ml-settings-main">
          <header className="ml-settings-main__header">
            <Typography.Title level={4} className="ml-settings-main__title">
              {t(`settings.sections.${section}`)}
            </Typography.Title>
            <Typography.Text type="secondary" className="ml-settings-main__subtitle">
              {t(`settings.sectionHints.${section}`)}
            </Typography.Text>
          </header>
          <div className="ml-settings-main__body">{renderSection()}</div>
        </div>
      </div>
    </Modal>
  )
}
