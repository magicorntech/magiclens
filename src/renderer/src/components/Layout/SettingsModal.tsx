import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  ColorPicker,
  Descriptions,
  Input,
  Modal,
  Progress,
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
  CheckCircle2,
  CloudDownload,
  Code2,
  Download,
  ExternalLink,
  FolderOpen,
  Gauge,
  Info,
  Keyboard,
  LayoutDashboard,
  Layers2,
  Link,
  Network,
  Palette,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  Trash2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UpdatePhase } from '@shared/types/update'
import { normalizeUtilityFabSide, type UiFontId, type UiFontWeightId, type UiTextContrastId } from '@shared/types/app'
import { UI_FONT_STACKS } from '@shared/types/uiTypography'
import { Icon } from '../ui/Icon'
import logo from '../../assets/logo.png'
import { refreshIntervalOptions, useLiveRefreshStore } from '../../stores/liveRefreshStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useUpdateStore } from '../../stores/updateStore'
import { useThemeStore } from '../../stores/themeStore'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { getSchemePalette } from '../../theme/schemes'
import { COLOR_SCHEME_DEFINITIONS, COLOR_SCHEME_GROUPS } from '../../theme/schemes'
import type { AppInfoResponse } from '@shared/types/app'
import { APP_LOCALES, APP_LOCALE_LABELS, type AppLocale } from '@shared/types/locale'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import { applyDedupeResult } from '../../clusterDedupe'
import { NodesDashboardSettings } from '../Nodes/NodesDashboardSettings'
import { MenuBarWidgetSettings } from './MenuBarWidgetSettings'
import { ChromeToolbarSettings } from './ChromeToolbarSettings'
import { KeyboardShortcutsSettings } from './KeyboardShortcutsSettings'
import { VpnExtensionsSettings } from './VpnExtensionsSettings'
import { PortForwardingSettings } from './PortForwardingSettings'
import { SparksSettings } from './SparksSettings'
import { DeveloperSettings } from './DeveloperSettings'
import { ThemeToggle } from './ThemeToggle'
import {
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
  SettingsSelectRow,
  ThemeSchemeCard
} from './SettingsPrimitives'
import { type SettingsSection as SettingsSectionId, useSettingsUiStore } from '../../stores/settingsUiStore'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const FONT_OPTION_IDS: UiFontId[] = ['default', 'system', 'manrope', 'plusJakartaSans', 'outfit', 'sora']

const UPDATE_PHASE_LABEL: Record<UpdatePhase, string> = {
  idle: 'Up to date',
  checking: 'Checking for updates…',
  available: 'Update available',
  'not-available': 'You are on the latest version',
  downloading: 'Downloading…',
  downloaded: 'Downloaded — restart required',
  error: 'Update check failed'
}

const UPDATE_PHASE_COLOR: Record<UpdatePhase, string> = {
  idle: 'default',
  checking: 'processing',
  available: 'blue',
  'not-available': 'green',
  downloading: 'processing',
  downloaded: 'green',
  error: 'red'
}

interface NavItem {
  key: SettingsSectionId
  icon: LucideIcon
  group: 'preferences' | 'system'
}

const NAV_ITEMS: NavItem[] = [
  { key: 'general', icon: Settings2, group: 'preferences' },
  { key: 'appearance', icon: Palette, group: 'preferences' },
  { key: 'sparks', icon: Sparkles, group: 'preferences' },
  { key: 'display', icon: LayoutDashboard, group: 'preferences' },
  { key: 'widget', icon: Gauge, group: 'preferences' },
  { key: 'keyboard', icon: Keyboard, group: 'preferences' },
  { key: 'updates', icon: CloudDownload, group: 'system' },
  { key: 'vpnExtensions', icon: Network, group: 'system' },
  { key: 'portForwarding', icon: Link, group: 'system' },
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
  const customThemes = useThemeStore((s) => s.customThemes)
  const activeCustomThemeId = useThemeStore((s) => s.activeCustomThemeId)
  const saveCustomTheme = useThemeStore((s) => s.saveCustomTheme)
  const selectCustomTheme = useThemeStore((s) => s.selectCustomTheme)
  const deleteCustomTheme = useThemeStore((s) => s.deleteCustomTheme)
  const isDarkMode = useResolvedDarkMode()
  const [newThemeName, setNewThemeName] = useState('')
  const [appInfo, setAppInfo] = useState<AppInfoResponse | null>(null)

  const updateSettings = useUpdateStore((s) => s.settings)
  const updateState = useUpdateStore((s) => s.state)
  const saveUpdateSettings = useUpdateStore((s) => s.saveSettings)
  const check = useUpdateStore((s) => s.check)
  const download = useUpdateStore((s) => s.download)
  const install = useUpdateStore((s) => s.install)
  const skip = useUpdateStore((s) => s.skip)
  const openReleasePage = useUpdateStore((s) => s.openReleasePage)
  const showClusterTabLogos = useDisplaySettingsStore((s) => s.showClusterTabLogos)
  const showResourceTabIcons = useDisplaySettingsStore((s) => s.showResourceTabIcons)
  const showFavoritesSection = useDisplaySettingsStore((s) => s.showFavoritesSection)
  const showWorkspacesSection = useDisplaySettingsStore((s) => s.showWorkspacesSection)
  const showClusterNamespace = useDisplaySettingsStore((s) => s.showClusterNamespace)
  const resourceDetailPlacement = useDisplaySettingsStore((s) => s.resourceDetailPlacement)
  const resourceDetailMaskBlur = useDisplaySettingsStore((s) => s.resourceDetailMaskBlur)
  const utilityPanelPlacement = useDisplaySettingsStore((s) => s.utilityPanelPlacement)
  const utilityFabSide = useDisplaySettingsStore((s) => s.utilityFabSide)
  const showUtilityFab = useDisplaySettingsStore((s) => s.showUtilityFab)
  const locale = useDisplaySettingsStore((s) => s.locale)
  const kubeconfigScanPath = useDisplaySettingsStore((s) => s.kubeconfigScanPath)
  const setShowClusterTabLogos = useDisplaySettingsStore((s) => s.setShowClusterTabLogos)
  const setShowResourceTabIcons = useDisplaySettingsStore((s) => s.setShowResourceTabIcons)
  const setShowFavoritesSection = useDisplaySettingsStore((s) => s.setShowFavoritesSection)
  const setShowWorkspacesSection = useDisplaySettingsStore((s) => s.setShowWorkspacesSection)
  const showWorkspaceClusterCounts = useDisplaySettingsStore((s) => s.showWorkspaceClusterCounts)
  const setShowWorkspaceClusterCounts = useDisplaySettingsStore((s) => s.setShowWorkspaceClusterCounts)
  const workspaceDockMagnification = useDisplaySettingsStore((s) => s.workspaceDockMagnification)
  const setWorkspaceDockMagnification = useDisplaySettingsStore((s) => s.setWorkspaceDockMagnification)
  const setShowClusterNamespace = useDisplaySettingsStore((s) => s.setShowClusterNamespace)
  const setResourceDetailPlacement = useDisplaySettingsStore((s) => s.setResourceDetailPlacement)
  const setResourceDetailMaskBlur = useDisplaySettingsStore((s) => s.setResourceDetailMaskBlur)
  const setUtilityPanelPlacement = useDisplaySettingsStore((s) => s.setUtilityPanelPlacement)
  const setUtilityFabSide = useDisplaySettingsStore((s) => s.setUtilityFabSide)
  const setShowUtilityFab = useDisplaySettingsStore((s) => s.setShowUtilityFab)
  const setLocale = useDisplaySettingsStore((s) => s.setLocale)
  const setKubeconfigScanPath = useDisplaySettingsStore((s) => s.setKubeconfigScanPath)
  const uiTypography = useDisplaySettingsStore((s) => s.uiTypography)
  const setUiTypography = useDisplaySettingsStore((s) => s.setUiTypography)
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

      case 'updates': {
        const updatePhase = updateState?.phase ?? 'idle'
        const isUpdateSkipped = !!updateState?.latestVersion && updateState.latestVersion === updateState.skippedVersion
        const isUpdateSpinning = updatePhase === 'checking' || updatePhase === 'downloading'
        return (
          <>
            <SettingsSection
              title={t('settings.sections.updates')}
              description={t('settings.sectionHints.updates')}
            >
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="Current version">v{updateState?.currentVersion ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="Latest version">
                  {updateState?.latestVersion ? `v${updateState.latestVersion}` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Space size={6}>
                    <Tag
                      icon={isUpdateSpinning ? <Icon icon={RefreshCw} variant="micro" className="ml-icon-spin" /> : undefined}
                      color={UPDATE_PHASE_COLOR[updatePhase]}
                    >
                      {UPDATE_PHASE_LABEL[updatePhase]}
                    </Tag>
                    {isUpdateSkipped && <Tag>Skipped by you</Tag>}
                  </Space>
                </Descriptions.Item>
              </Descriptions>

              {updatePhase === 'downloading' && (
                <Progress percent={Math.round(updateState?.progress?.percent ?? 0)} status="active" />
              )}

              {updatePhase === 'error' && updateState?.error && (
                <Alert type="error" showIcon message="Update error" description={updateState.error} />
              )}

              {updatePhase === 'downloaded' && (
                <Alert
                  type="success"
                  showIcon
                  icon={<Icon icon={CheckCircle2} variant="action" />}
                  message="Update downloaded"
                  description="Restart MagicLens to finish installing the new version."
                />
              )}

              {updateState?.releaseNotes && (
                <div>
                  <Typography.Text strong>Release notes</Typography.Text>
                  <div
                    style={{
                      marginTop: 8,
                      maxHeight: 220,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontSize: 13,
                      background: 'rgba(127,127,127,0.08)',
                      borderRadius: 6,
                      padding: 12
                    }}
                  >
                    {updateState.releaseNotes}
                  </div>
                </div>
              )}

              <Space wrap>
                <Button
                  icon={<Icon icon={RefreshCw} variant="detail" />}
                  loading={updatePhase === 'checking'}
                  onClick={() => void check()}
                >
                  {t('settings.updates.checkNow')}
                </Button>
                {updatePhase === 'available' && !isUpdateSkipped && (
                  <Button type="primary" icon={<Icon icon={Download} variant="detail" />} onClick={() => void download()}>
                    Download update
                  </Button>
                )}
                {updatePhase === 'available' && !isUpdateSkipped && (
                  <Button onClick={() => void skip()}>Skip this version</Button>
                )}
                {updateState?.releaseUrl && (
                  <Button icon={<Icon icon={ExternalLink} variant="detail" />} onClick={() => void openReleasePage()}>
                    Open release page
                  </Button>
                )}
                {updatePhase === 'downloaded' && (
                  <Button type="primary" icon={<Icon icon={RefreshCw} variant="detail" />} onClick={() => void install()}>
                    Restart & install
                  </Button>
                )}
              </Space>
            </SettingsSection>

            <SettingsSection
              title={t('settings.updates.preferencesTitle')}
              description={t('settings.updates.preferencesHint')}
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
              <SettingsToggleRow
                title={t('settings.updates.autoDownload')}
                checked={updateSettings?.autoDownload ?? true}
                onChange={(checked) => void saveUpdateSettings({ autoDownload: checked })}
              />
              <SettingsToggleRow
                title={t('settings.updates.askBeforeInstall')}
                checked={updateSettings?.askBeforeInstall ?? true}
                onChange={(checked) => void saveUpdateSettings({ askBeforeInstall: checked })}
              />
            </SettingsSection>
          </>
        )
      }

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
              title={t('settings.display.fabTitle')}
              description={t('settings.display.fabHint')}
            >
              <SettingsToggleRow
                title={t('settings.display.showUtilityFab')}
                description={t('settings.display.showUtilityFabHint')}
                checked={showUtilityFab}
                onChange={(checked) => void setShowUtilityFab(checked)}
              />
              <div className="ml-fab-dock-picker" role="radiogroup" aria-label={t('settings.display.fabDockLabel')}>
                {(
                  [
                    ['left-middle', 'fabSideLeftMiddle'],
                    ['right-middle', 'fabSideRightMiddle'],
                    ['left-bottom', 'fabSideLeftBottom'],
                    ['right-bottom', 'fabSideRightBottom']
                  ] as const
                ).map(([value, labelKey]) => {
                  const selected = normalizeUtilityFabSide(utilityFabSide) === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!showUtilityFab}
                      className={`ml-fab-dock-picker__cell${selected ? ' is-selected' : ''}`}
                      data-dock={value}
                      onClick={() => void setUtilityFabSide(value)}
                    >
                      <span className="ml-fab-dock-picker__frame" aria-hidden>
                        <span className="ml-fab-dock-picker__dot" />
                      </span>
                      <span className="ml-fab-dock-picker__label">{t(`settings.display.${labelKey}`)}</span>
                    </button>
                  )
                })}
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
                title={t('settings.display.showWorkspaceClusterCounts')}
                description={t('settings.display.showWorkspaceClusterCountsHint')}
                checked={showWorkspaceClusterCounts}
                onChange={(checked) => void setShowWorkspaceClusterCounts(checked)}
              />
              <SettingsToggleRow
                title={t('settings.display.workspaceDockMagnification')}
                description={t('settings.display.workspaceDockMagnificationHint')}
                checked={workspaceDockMagnification}
                onChange={(checked) => void setWorkspaceDockMagnification(checked)}
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
              title={t('settings.display.chromeToolbarTitle')}
              description={t('settings.display.chromeToolbarHint')}
            >
              <ChromeToolbarSettings />
            </SettingsSection>

            <SettingsSection
              title={t('settings.display.nodesTitle')}
              description={t('settings.display.nodesHint')}
            >
              <NodesDashboardSettings />
            </SettingsSection>
          </>
        )

      case 'widget':
        return <MenuBarWidgetSettings />

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
              title={t('settings.appearance.typographyTitle')}
              description={t('settings.appearance.typographyHint')}
            >
              <SettingsSelectRow
                title={t('settings.appearance.font')}
                value={uiTypography.font}
                onChange={(value: UiFontId) => void setUiTypography({ font: value })}
                options={FONT_OPTION_IDS.map((id) => ({
                  value: id,
                  label: (
                    <span style={{ fontFamily: UI_FONT_STACKS[id] }}>
                      {t(`settings.appearance.font_${id}`)}
                    </span>
                  )
                }))}
              />
              <SettingsSelectRow
                title={t('settings.appearance.weight')}
                value={uiTypography.weight}
                onChange={(value: UiFontWeightId) => void setUiTypography({ weight: value })}
                options={[
                  { value: 'regular', label: t('settings.appearance.weightRegular') },
                  { value: 'medium', label: t('settings.appearance.weightMedium') },
                  { value: 'semibold', label: t('settings.appearance.weightSemibold') }
                ]}
              />
              <SettingsSelectRow
                title={t('settings.appearance.contrast')}
                value={uiTypography.contrast}
                onChange={(value: UiTextContrastId) => void setUiTypography({ contrast: value })}
                options={[
                  { value: 'soft', label: t('settings.appearance.contrastSoft') },
                  { value: 'normal', label: t('settings.appearance.contrastNormal') },
                  { value: 'bright', label: t('settings.appearance.contrastBright') }
                ]}
              />
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
                        <>
                          <ThemeSchemeCard
                            name={t('common.custom')}
                            description={t('settings.appearance.customSwatch')}
                            swatches={[customAccentColor]}
                            selected={colorScheme === 'custom' && activeCustomThemeId === null}
                            onSelect={() => setColorScheme('custom')}
                            trailing={<Icon icon={Palette} variant="detail" />}
                          />
                          {customThemes.map((theme) => (
                            <ThemeSchemeCard
                              key={theme.id}
                              name={theme.name}
                              description={t('settings.appearance.customSwatch')}
                              swatches={[theme.accentColor]}
                              selected={colorScheme === 'custom' && activeCustomThemeId === theme.id}
                              onSelect={() => selectCustomTheme(theme.id)}
                            />
                          ))}
                        </>
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

              {(() => {
                const preview = getSchemePalette('custom', isDarkMode, customAccentColor)
                const swatches: { label: string; color: string }[] = [
                  { label: t('settings.appearance.previewPrimary'), color: preview.primary },
                  { label: t('settings.appearance.previewSidebar'), color: preview.sidebarBg },
                  { label: t('settings.appearance.previewBackground'), color: preview.bgLayout }
                ]
                return (
                  <div className="ml-settings-theme-preview">
                    {swatches.map((s) => (
                      <div key={s.label} className="ml-settings-theme-preview__item">
                        <span className="ml-settings-theme-preview__swatch" style={{ background: s.color }} />
                        <span className="ml-settings-theme-preview__label">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {activeCustomThemeId ? (
                <SettingsRow
                  title={t('settings.appearance.activeCustomTheme', {
                    name: customThemes.find((t2) => t2.id === activeCustomThemeId)?.name ?? ''
                  })}
                  control={
                    <Button
                      danger
                      icon={<Icon icon={Trash2} variant="detail" />}
                      onClick={() => deleteCustomTheme(activeCustomThemeId)}
                    >
                      {t('settings.appearance.deleteCustomTheme')}
                    </Button>
                  }
                />
              ) : (
                <SettingsRow
                  title={t('settings.appearance.saveCustomTheme')}
                  description={t('settings.appearance.saveCustomThemeHint')}
                  stacked
                  control={
                    <Space.Compact style={{ width: '100%', maxWidth: 360 }}>
                      <Input
                        value={newThemeName}
                        placeholder={t('settings.appearance.saveCustomThemePlaceholder')}
                        onChange={(e) => setNewThemeName(e.target.value)}
                        onPressEnter={() => {
                          if (!newThemeName.trim()) return
                          saveCustomTheme(newThemeName)
                          setNewThemeName('')
                        }}
                      />
                      <Button
                        type="primary"
                        icon={<Icon icon={Save} variant="detail" />}
                        disabled={!newThemeName.trim()}
                        onClick={() => {
                          saveCustomTheme(newThemeName)
                          setNewThemeName('')
                        }}
                      >
                        {t('settings.appearance.save')}
                      </Button>
                    </Space.Compact>
                  }
                />
              )}
            </SettingsSection>
          </>
        )

      case 'sparks':
        return <SparksSettings />

      case 'vpnExtensions':
        return <VpnExtensionsSettings />

      case 'portForwarding':
        return <PortForwardingSettings />

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
