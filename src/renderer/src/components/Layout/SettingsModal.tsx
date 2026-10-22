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
  Slider,
  Space,
  Tag,
  Typography,
  message
} from 'antd'
import type { AggregationColor } from 'antd/es/color-picker/color'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Bot,
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
  Search,
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
import magicornLogo from '../../assets/magicorn-logo.png'
import { refreshIntervalOptions, useLiveRefreshStore } from '../../stores/liveRefreshStore'
import { useTablePageSizeStore } from '../../stores/tablePageSizeStore'
import { TABLE_PAGE_SIZE_OPTIONS } from '../../utils/tablePagination'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useUpdateStore } from '../../stores/updateStore'
import { useThemeStore, type CustomColorSlot, type ThemeFamily } from '../../stores/themeStore'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { COLOR_SCHEME_DEFINITIONS } from '../../theme/schemes'
import type { AppInfoResponse } from '@shared/types/app'
import { APP_LOCALES, APP_LOCALE_LABELS, type AppLocale } from '@shared/types/locale'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import { applyDedupeResult } from '../../clusterDedupe'
import { NodesDashboardSettings } from '../Nodes/NodesDashboardSettings'
import { MenuBarWidgetSettings } from './MenuBarWidgetSettings'
import { ChromeToolbarSettings } from './ChromeToolbarSettings'
import { ResourceNavOrderSettings } from './ResourceNavOrderSettings'
import { WorkspaceOrderSettings } from './WorkspaceOrderSettings'
import { KeyboardShortcutsSettings } from './KeyboardShortcutsSettings'
import { VpnExtensionsSettings } from './VpnExtensionsSettings'
import { PortForwardingSettings } from './PortForwardingSettings'
import { AlertsSettings } from './AlertsSettings'
import { SparksSettings } from './SparksSettings'
import { AiAgentSettings } from './AiAgentSettings'
import { SearchSettings } from './SearchSettings'
import { DeveloperSettings } from './DeveloperSettings'
import { ThemeToggle } from './ThemeToggle'
import {
  SettingsRow,
  SettingsPaneTabs,
  SettingsSection,
  SettingsToggleRow,
  SettingsSelectRow,
  ThemeSwatch
} from './SettingsPrimitives'
import { type SettingsSection as SettingsSectionId, useSettingsUiStore } from '../../stores/settingsUiStore'
import { SETTINGS_SEARCH } from './settingsSearchCatalog'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const FONT_OPTION_IDS: UiFontId[] = ['default', 'system', 'manrope', 'plusJakartaSans', 'outfit', 'sora']

function schemeChipColor(id: string, swatches: readonly string[]): string {
  if (id === 'white' || id === 'black') return swatches[1] ?? swatches[0]
  return swatches[0]
}

function AppearanceSettings({
  pane,
  onPaneChange
}: {
  pane: string
  onPaneChange: (pane: string) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const isDark = useResolvedDarkMode()
  const family: ThemeFamily = isDark ? 'dark' : 'light'
  const scheme = useThemeStore((s) => (isDark ? s.darkScheme : s.lightScheme))
  const setScheme = useThemeStore((s) => (isDark ? s.setDarkScheme : s.setLightScheme))
  const customPalette = useThemeStore((s) => (isDark ? s.customPaletteDark : s.customPaletteLight))
  const setCustomColor = useThemeStore((s) => s.setCustomColor)
  const customThemes = useThemeStore((s) => (isDark ? s.customThemesDark : s.customThemesLight))
  const activeCustomThemeId = useThemeStore((s) =>
    isDark ? s.activeCustomThemeIdDark : s.activeCustomThemeIdLight
  )
  const saveCustomTheme = useThemeStore((s) => s.saveCustomTheme)
  const renameCustomTheme = useThemeStore((s) => s.renameCustomTheme)
  const selectCustomTheme = useThemeStore((s) => s.selectCustomTheme)
  const deleteCustomTheme = useThemeStore((s) => s.deleteCustomTheme)
  const beginCustomDraft = useThemeStore((s) => s.beginCustomDraft)
  const uiTypography = useDisplaySettingsStore((s) => s.uiTypography)
  const setUiTypography = useDisplaySettingsStore((s) => s.setUiTypography)
  const [newThemeName, setNewThemeName] = useState('')
  const customSelected = scheme === 'custom'
  const activeThemeName = customThemes.find((theme) => theme.id === activeCustomThemeId)?.name ?? ''

  useEffect(() => {
    setNewThemeName(activeThemeName)
  }, [activeCustomThemeId, activeThemeName])

  return (
    <>
      <SettingsPaneTabs
        value={pane}
        onChange={onPaneChange}
        options={[
          { value: 'theme', label: t('settings.panes.theme') },
          { value: 'type', label: t('settings.panes.type') }
        ]}
      />
      {pane === 'type' ? (
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
      ) : (
      <>
      <SettingsSection
        title={t('settings.appearance.modeTitle')}
        description={t('settings.appearance.modeHint')}
      >
        <div className="ml-settings-theme-mode ml-settings-theme-mode--wide">
          <ThemeToggle labeled />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('settings.appearance.colorTitle')}
        description={t('settings.appearance.colorHint', {
          mode: t(isDark ? 'settings.appearance.modeDark' : 'settings.appearance.modeLight')
        })}
      >
        <div className="ml-settings-swatch-grid">
          {COLOR_SCHEME_DEFINITIONS.map((item) => (
            <ThemeSwatch
              key={item.id}
              name={item.name}
              color={schemeChipColor(item.id, item.swatches)}
              colors={[...item.swatches]}
              selected={scheme === item.id}
              onSelect={() => setScheme(item.id)}
            />
          ))}
          <ThemeSwatch
            name={t('common.custom')}
            color={customPalette.accent}
            colors={[customPalette.accent, customPalette.sidebar, customPalette.background]}
            selected={customSelected && activeCustomThemeId === null}
            onSelect={() => beginCustomDraft(family)}
          />
          {customThemes.map((theme) => (
            <ThemeSwatch
              key={theme.id}
              name={theme.name}
              color={theme.accentColor}
              colors={[theme.accentColor, theme.sidebar, theme.background]}
              selected={customSelected && activeCustomThemeId === theme.id}
              onSelect={() => selectCustomTheme(theme.id, family)}
            />
          ))}
        </div>
        {customSelected ? (
          <div className="ml-settings-theme-editor">
            <div className="ml-settings-theme-colors">
              {(
                [
                  ['accent', 'settings.appearance.customAccent'],
                  ['background', 'settings.appearance.customBackground'],
                  ['surface', 'settings.appearance.customSurface'],
                  ['sidebar', 'settings.appearance.customSidebar']
                ] as const
              ).map(([slot, label]) => (
                <label key={slot} className="ml-settings-theme-color">
                  <ColorPicker
                    value={customPalette[slot]}
                    onChange={(color: AggregationColor) =>
                      setCustomColor(slot as CustomColorSlot, color.toHexString(), family)
                    }
                  />
                  <span>{t(label)}</span>
                </label>
              ))}
            </div>
            <div className="ml-settings-theme-custom">
              <Input
                value={newThemeName}
                placeholder={t('settings.appearance.saveCustomThemePlaceholder')}
                onChange={(e) => setNewThemeName(e.target.value)}
                onPressEnter={() => {
                  if (!newThemeName.trim()) return
                  if (activeCustomThemeId) renameCustomTheme(newThemeName, family)
                  else {
                    saveCustomTheme(newThemeName, family)
                    setNewThemeName('')
                  }
                }}
                style={{ flex: 1, minWidth: 140, maxWidth: 240 }}
              />
              {activeCustomThemeId ? (
                <Button
                  type="primary"
                  icon={<Icon icon={Save} variant="detail" />}
                  disabled={!newThemeName.trim()}
                  onClick={() => renameCustomTheme(newThemeName, family)}
                >
                  {t('settings.appearance.updateCustomTheme')}
                </Button>
              ) : null}
              <Button
                icon={<Icon icon={Save} variant="detail" />}
                disabled={!newThemeName.trim()}
                onClick={() => {
                  saveCustomTheme(newThemeName, family)
                  setNewThemeName('')
                }}
              >
                {t(activeCustomThemeId ? 'settings.appearance.saveCustomThemeAsNew' : 'settings.appearance.save')}
              </Button>
              {activeCustomThemeId ? (
                <Button
                  danger
                  icon={<Icon icon={Trash2} variant="detail" />}
                  onClick={() => {
                    deleteCustomTheme(activeCustomThemeId, family)
                    setNewThemeName('')
                  }}
                >
                  {t('settings.appearance.deleteCustomTheme')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </SettingsSection>
      </>
      )}
    </>
  )
}

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

function paneForSettingsKey(key: string): string | null {
  if (key.includes('typography') || key.includes('.font') || key.includes('weight') || key.includes('contrast')) {
    return 'type'
  }
  if (key.startsWith('settings.appearance')) return 'theme'
  if (key.includes('kubeconfig') || key.includes('dedupe')) return 'clusters'
  if (key.startsWith('settings.language') || key.startsWith('settings.general') || key.includes('sectionHints.general')) {
    return 'app'
  }
  if (
    key.includes('preferencesTitle') ||
    key.includes('checkAutomatically') ||
    key.includes('checkOnStartup') ||
    key.includes('includePrerelease') ||
    key.includes('autoDownload') ||
    key.includes('askBeforeInstall')
  ) {
    return 'preferences'
  }
  if (key.includes('updates')) return 'status'
  if (key.includes('nodes')) return 'nodes'
  if (key.includes('workspaceOrder') || key.includes('resourceNav')) return 'order'
  if (
    key.includes('sidebar') ||
    key.includes('showFavorites') ||
    key.includes('showWorkspaces') ||
    key.includes('showSidebarLogos') ||
    key.includes('workspaceDock') ||
    key.includes('showClusterNamespace') ||
    key.includes('tabIcons') ||
    key.includes('showClusterLogos') ||
    key.includes('showResourceIcons') ||
    key.includes('chromeToolbar')
  ) {
    return 'sidebar'
  }
  if (key.startsWith('settings.display')) return 'layout'
  if (key.includes('molly')) return 'molly'
  if (key.includes('cliWorkdir') || key.includes('hideAssistant') || key.includes('pulseChrome') || key.includes('optionsTitle')) {
    return 'options'
  }
  if (key.startsWith('settings.aiAgent')) return 'providers'
  if (key.includes('search.types') || (key.includes('typesTitle') && !key.startsWith('settings.alerts'))) return 'sources'
  if (key.startsWith('settings.search') || key.includes('sections.search')) return 'behavior'
  return null
}

interface NavItem {
  key: SettingsSectionId
  icon: LucideIcon
  group: 'preferences' | 'system'
}

const NAV_ITEMS: NavItem[] = [
  { key: 'general', icon: Settings2, group: 'preferences' },
  { key: 'alerts', icon: Bell, group: 'preferences' },
  { key: 'appearance', icon: Palette, group: 'preferences' },
  { key: 'sparks', icon: Sparkles, group: 'preferences' },
  { key: 'aiAgent', icon: Bot, group: 'preferences' },
  { key: 'display', icon: LayoutDashboard, group: 'preferences' },
  { key: 'widget', icon: Gauge, group: 'preferences' },
  { key: 'keyboard', icon: Keyboard, group: 'preferences' },
  { key: 'search', icon: Search, group: 'preferences' },
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
    layoutMode === 'mobile'
      ? 'calc(100vw - 12px)'
      : layoutMode === 'compact'
        ? 'min(1040px, calc(100vw - 32px))'
        : 'min(1320px, calc(100vw - 48px))'
  const modalHeight =
    layoutMode === 'mobile'
      ? 'calc(100vh - 24px)'
      : layoutMode === 'compact'
        ? 'min(760px, calc(100vh - 48px))'
        : 'min(860px, calc(100vh - 56px))'
  const section = useSettingsUiStore((s) => s.section)
  const setSection = useSettingsUiStore((s) => s.setSection)
  const interval = useLiveRefreshStore((s) => s.interval)
  const setInterval_ = useLiveRefreshStore((s) => s.setInterval)
  const tablePageSize = useTablePageSizeStore((s) => s.pageSize)
  const setTablePageSize = useTablePageSizeStore((s) => s.setPageSize)
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
  const showSidebarLogos = useDisplaySettingsStore((s) => s.showSidebarLogos)
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
  const setShowSidebarLogos = useDisplaySettingsStore((s) => s.setShowSidebarLogos)
  const workspaceDockMagnification = useDisplaySettingsStore((s) => s.workspaceDockMagnification)
  const setWorkspaceDockMagnification = useDisplaySettingsStore((s) => s.setWorkspaceDockMagnification)
  const setShowClusterNamespace = useDisplaySettingsStore((s) => s.setShowClusterNamespace)
  const navIconBrightness = useDisplaySettingsStore((s) => s.navIconBrightness)
  const setNavIconBrightness = useDisplaySettingsStore((s) => s.setNavIconBrightness)
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
  const [settingsQuery, setSettingsQuery] = useState('')
  const [settingsJump, setSettingsJump] = useState<string | null>(null)
  const [paneBySection, setPaneBySection] = useState<Partial<Record<SettingsSectionId, string>>>({})

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

  const settingsHits = useMemo(() => {
    const q = settingsQuery.trim().toLowerCase()
    if (!q) return []
    const hits: Array<{ section: SettingsSectionId; label: string; key: string }> = []
    for (const group of SETTINGS_SEARCH) {
      for (const key of group.keys) {
        const label = t(key)
        if (label.toLowerCase().includes(q) || key.toLowerCase().includes(q)) {
          hits.push({ section: group.section, label, key })
        }
      }
    }
    return hits.slice(0, 24)
  }, [settingsQuery, t])

  useEffect(() => {
    if (!settingsJump) return
    const needle = settingsJump.toLowerCase()
    const root = document.querySelector('.ml-settings-main')
    const nodes = root?.querySelectorAll<HTMLElement>('.ml-settings-section__title, .ml-settings-row__title')
    if (nodes) {
      for (const node of nodes) {
        if ((node.textContent || '').toLowerCase().includes(needle)) {
          node.closest('section, .ml-settings-row')?.scrollIntoView({ block: 'start' })
          break
        }
      }
    }
    setSettingsJump(null)
  }, [settingsJump, section])

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
            <SettingsPaneTabs
              value={paneBySection.general ?? 'app'}
              onChange={(pane) => setPaneBySection((current) => ({ ...current, general: pane }))}
              options={[
                { value: 'app', label: t('settings.panes.app') },
                { value: 'clusters', label: t('settings.panes.clusters') }
              ]}
            />
            {(paneBySection.general ?? 'app') === 'clusters' ? null : (
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
              title={t('settings.general.pageSizeTitle')}
              description={t('settings.general.pageSizeHint')}
            >
              <div className="ml-settings-segmented-wrap">
                <Select
                  value={tablePageSize}
                  onChange={setTablePageSize}
                  options={TABLE_PAGE_SIZE_OPTIONS.map((size) => ({ value: Number(size), label: size }))}
                  style={{ width: 140, maxWidth: '100%' }}
                />
              </div>
            </SettingsSection>
            </>
            )}
            {(paneBySection.general ?? 'app') === 'clusters' ? (
            <>
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
            ) : null}
          </>
        )

      case 'alerts':
        return <AlertsSettings />

      case 'updates': {
        const updatePhase = updateState?.phase ?? 'idle'
        const isUpdateSkipped = !!updateState?.latestVersion && updateState.latestVersion === updateState.skippedVersion
        const isUpdateSpinning = updatePhase === 'checking' || updatePhase === 'downloading'
        const updatesPane = paneBySection.updates ?? 'status'
        return (
          <>
            <SettingsPaneTabs
              value={updatesPane}
              onChange={(pane) => setPaneBySection((current) => ({ ...current, updates: pane }))}
              options={[
                { value: 'status', label: t('settings.panes.status') },
                { value: 'preferences', label: t('settings.panes.preferences') }
              ]}
            />
            {updatesPane === 'preferences' ? null : (
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
                      color={
                        updatePhase === 'error' && updateState?.errorKind !== 'download'
                          ? 'orange'
                          : UPDATE_PHASE_COLOR[updatePhase]
                      }
                    >
                      {updatePhase === 'error' && updateState?.errorKind === 'download'
                        ? 'Download failed'
                        : UPDATE_PHASE_LABEL[updatePhase]}
                    </Tag>
                    {isUpdateSkipped && <Tag>Skipped by you</Tag>}
                  </Space>
                </Descriptions.Item>
              </Descriptions>

              {updatePhase === 'downloading' && (
                <Progress percent={Math.round(updateState?.progress?.percent ?? 0)} status="active" />
              )}

              {updatePhase === 'error' && updateState?.error && (
                <Alert
                  type={updateState.errorKind === 'download' ? 'error' : 'warning'}
                  showIcon
                  message={
                    updateState.errorKind === 'download'
                      ? 'Update error'
                      : 'Could not check for updates'
                  }
                  description={updateState.error}
                />
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
                      borderRadius: 0,
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
            )}
            {updatesPane === 'preferences' ? (
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
            ) : null}
          </>
        )
      }

      case 'display': {
        const displayPane = paneBySection.display ?? 'layout'
        return (
          <>
            <SettingsPaneTabs
              value={displayPane}
              onChange={(pane) => setPaneBySection((current) => ({ ...current, display: pane }))}
              options={[
                { value: 'layout', label: t('settings.panes.layout') },
                { value: 'sidebar', label: t('settings.panes.sidebar') },
                { value: 'order', label: t('settings.panes.order') },
                { value: 'nodes', label: t('settings.panes.nodes') }
              ]}
            />
            {displayPane === 'layout' ? (
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
            </>
            ) : null}
            {displayPane === 'sidebar' ? (
            <>
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
                title={t('settings.display.showSidebarLogos')}
                description={t('settings.display.showSidebarLogosHint')}
                checked={showSidebarLogos}
                onChange={(checked) => void setShowSidebarLogos(checked)}
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
              <SettingsRow
                title={t('settings.display.navIconBrightness')}
                description={t('settings.display.navIconBrightnessHint', { value: navIconBrightness })}
                stacked
                control={
                  <Slider
                    min={40}
                    max={100}
                    step={5}
                    value={navIconBrightness}
                    onChange={(value: number) => void setNavIconBrightness(value)}
                    tooltip={{ formatter: (value) => `${value ?? navIconBrightness}%` }}
                  />
                }
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
            </>
            ) : null}
            {displayPane === 'order' ? (
            <>
            <SettingsSection
              title={t('settings.display.workspaceOrderTitle')}
              description={t('settings.display.workspaceOrderHint')}
            >
              <WorkspaceOrderSettings />
            </SettingsSection>
            <SettingsSection
              title={t('settings.display.resourceNavOrderTitle')}
              description={t('settings.display.resourceNavOrderHint')}
            >
              <ResourceNavOrderSettings />
            </SettingsSection>
            </>
            ) : null}
            {displayPane === 'nodes' ? (
            <SettingsSection
              title={t('settings.display.nodesTitle')}
              description={t('settings.display.nodesHint')}
            >
              <NodesDashboardSettings />
            </SettingsSection>
            ) : null}
          </>
        )
      }

      case 'widget':
        return <MenuBarWidgetSettings />

      case 'keyboard':
        return <KeyboardShortcutsSettings />

      case 'search':
        return (
          <SearchSettings
            pane={paneBySection.search ?? 'behavior'}
            onPaneChange={(pane) => setPaneBySection((current) => ({ ...current, search: pane }))}
          />
        )

      case 'appearance':
        return (
          <AppearanceSettings
            pane={paneBySection.appearance ?? 'theme'}
            onPaneChange={(pane) => setPaneBySection((current) => ({ ...current, appearance: pane }))}
          />
        )

      case 'sparks':
        return <SparksSettings />

      case 'aiAgent':
        return (
          <AiAgentSettings
            pane={paneBySection.aiAgent ?? 'molly'}
            onPaneChange={(pane) => setPaneBySection((current) => ({ ...current, aiAgent: pane }))}
          />
        )

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
                    {appInfo?.platform ? ` · ${appInfo.platform}` : ''}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="ml-settings-about__maker"
                onClick={() => void window.api.app.openExternalUrl('https://magicorn.co/')}
              >
                <img src={magicornLogo} alt="Magicorn" className="ml-settings-about__maker-logo" />
                <span className="ml-settings-about__maker-copy">
                  <span className="ml-settings-about__maker-label">{t('settings.about.developedBy')}</span>
                  <span className="ml-settings-about__maker-name">Magicorn</span>
                  <span className="ml-settings-about__maker-url">magicorn.co</span>
                </span>
                <Icon icon={ExternalLink} variant="detail" className="ml-settings-about__maker-link" />
              </button>
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
          <div className="ml-settings-nav__search">
            <Input
              allowClear
              prefix={<Icon icon={Search} variant="micro" />}
              value={settingsQuery}
              placeholder={t('settings.searchPlaceholder')}
              onChange={(e) => setSettingsQuery(e.target.value)}
            />
          </div>
          {settingsQuery.trim() ? (
            <div className="ml-settings-nav__results" role="listbox" aria-label={t('settings.searchPlaceholder')}>
              {settingsHits.length === 0 ? (
                <p className="ml-settings-nav__empty">{t('settings.searchEmpty')}</p>
              ) : (
                settingsHits.map((hit) => (
                  <button
                    key={`${hit.section}-${hit.label}`}
                    type="button"
                    className="ml-settings-nav__result"
                    onClick={() => {
                      const pane = paneForSettingsKey(hit.key)
                      if (pane) setPaneBySection((current) => ({ ...current, [hit.section]: pane }))
                      setSection(hit.section)
                      setSettingsJump(hit.label)
                    }}
                  >
                    <span className="ml-settings-nav__result-label">{hit.label}</span>
                    <span className="ml-settings-nav__result-section">{t(`settings.sections.${hit.section}`)}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {renderNavGroup(preferenceNav, t('settings.navGroups.preferences'))}
              {renderNavGroup(systemNav, t('settings.navGroups.system'))}
            </>
          )}
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
