import { theme as antdThemeApi } from 'antd'
import type { ThemeConfig } from 'antd'
import type { ColorSchemeId } from './schemes'
import { getSchemePalette } from './schemes'
import { withAlpha } from './colorUtils'
import { typography, radius } from '../design-system/tokens'

export function buildAntdTheme(
  isDark: boolean,
  colorScheme: ColorSchemeId = 'slate',
  customAccent?: string
): ThemeConfig {
  const p = getSchemePalette(colorScheme, isDark, customAccent)

  return {
    algorithm: isDark ? antdThemeApi.darkAlgorithm : antdThemeApi.defaultAlgorithm,
    token: {
      colorPrimary: p.primary,
      colorInfo: p.info,
      colorSuccess: p.success,
      colorWarning: p.warning,
      colorError: p.error,
      colorBgLayout: p.bgLayout,
      colorBgContainer: p.bgContainer,
      colorBgElevated: p.bgElevated,
      colorBorder: p.border,
      colorBorderSecondary: p.borderSecondary,
      colorText: p.text,
      colorTextSecondary: p.textSecondary,
      colorTextTertiary: p.textTertiary,
      borderRadius: radius.sm,
      borderRadiusLG: radius.md,
      borderRadiusSM: radius.xs,
      wireframe: false,
      fontFamily: typography.fontSans,
      fontSize: 13,
      controlHeight: 32,
      motionDurationMid: '0.18s',
      motionEaseInOut: 'cubic-bezier(0.22, 1, 0.36, 1)'
    },
    components: {
      Layout: {
        siderBg: p.resourceSiderBg,
        headerBg: p.bgContainer,
        bodyBg: p.bgLayout,
        triggerBg: p.bgElevated
      },
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemSelectedBg: withAlpha(p.primary, isDark ? 0.14 : 0.1),
        itemHoverBg: p.sidebarHover,
        itemSelectedColor: p.primary,
        itemColor: p.textSecondary,
        itemHeight: 34,
        iconSize: 16,
        fontSize: 13,
        activeBarBorderWidth: 0
      },
      Tabs: {
        cardBg: p.bgContainer,
        itemSelectedColor: p.primary,
        inkBarColor: p.primary,
        horizontalMargin: '0'
      },
      Table: {
        headerBg: p.bgSpotlight,
        rowHoverBg: p.selectionBg,
        borderColor: 'transparent',
        headerBorderRadius: 0,
        cellPaddingBlock: 8,
        cellPaddingInline: 12,
        lineWidth: 0,
        lineType: 'solid'
      },
      Button: {
        primaryShadow: 'none',
        defaultShadow: 'none',
        fontWeight: 500,
        controlHeight: 30,
        borderRadius: radius.sm,
        defaultBorderColor: p.borderSecondary,
        defaultBg: 'transparent',
        defaultHoverBg: p.bgSpotlight,
        defaultHoverBorderColor: p.borderSecondary,
        defaultHoverColor: p.text
      },
      Tag: {
        defaultBg: isDark ? p.bgElevated : p.bgSpotlight,
        borderRadiusSM: radius.sm
      },
      Segmented: {
        trackBg: isDark ? p.bgElevated : p.bgSpotlight,
        itemSelectedBg: p.bgContainer,
        borderRadius: radius.sm,
        borderRadiusSM: radius.xs
      },
      Input: {
        activeShadow: `0 0 0 2px ${withAlpha(p.primary, 0.1)}`,
        borderRadius: radius.sm,
        hoverBorderColor: p.border,
        activeBorderColor: p.primary
      },
      Modal: {
        borderRadiusLG: radius.md,
        headerBg: p.bgContainer,
        contentBg: p.bgContainer
      },
      Drawer: {
        borderRadiusLG: radius.md
      },
      Card: {
        borderRadiusLG: radius.md,
        boxShadowTertiary: 'none',
        lineWidth: 0
      }
    }
  }
}

/** Pushes palette values to CSS custom properties for non-antd surfaces. */
export function syncDocumentTheme(
  isDark: boolean,
  colorScheme: ColorSchemeId = 'slate',
  customAccent?: string
): void {
  const p = getSchemePalette(colorScheme, isDark, customAccent)
  const root = document.documentElement
  root.setAttribute('data-theme', isDark ? 'dark' : 'light')

  const vars: Record<string, string> = {
    '--ml-primary': p.primary,
    '--ml-primary-hover': p.primaryHover,
    '--ml-info': p.info,
    '--ml-success': p.success,
    '--ml-warning': p.warning,
    '--ml-error': p.error,
    '--ml-bg-layout': p.bgLayout,
    '--ml-bg-container': p.bgContainer,
    '--ml-bg-elevated': p.bgElevated,
    '--ml-bg-spotlight': p.bgSpotlight,
    '--ml-border': p.border,
    '--ml-border-secondary': p.borderSecondary,
    '--ml-text': p.text,
    '--ml-text-secondary': p.textSecondary,
    '--ml-text-tertiary': p.textTertiary,
    '--ml-sidebar-bg': p.sidebarBg,
    '--ml-sidebar-text': p.sidebarText,
    '--ml-sidebar-muted': p.sidebarMuted,
    '--ml-sidebar-subtle': p.sidebarSubtle,
    '--ml-sidebar-divider': p.sidebarDivider,
    '--ml-sidebar-hover': p.sidebarHover,
    '--ml-sidebar-active': p.sidebarActive,
    '--ml-sidebar-control-bg': p.sidebarControlBg,
    '--ml-sidebar-control-border': p.sidebarControlBorder,
    '--ml-resource-sider-bg': p.resourceSiderBg,
    '--ml-panel-bg': p.panelBg,
    '--ml-terminal-bg': p.terminalBg,
    '--ml-terminal-fg': p.terminalFg,
    '--ml-terminal-muted': p.terminalMuted,
    '--ml-shadow-sm': isDark ? '0 1px 2px rgba(0,0,0,0.25)' : '0 1px 2px rgba(15,23,42,0.04)',
    '--ml-shadow-md': isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(15,23,42,0.06)',
    '--ml-shadow-lg': isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(15,23,42,0.08)',
    '--ml-selection-bg': p.selectionBg,
    '--ml-splash-accent': p.primary,
    '--ml-splash-accent-2': p.primaryHover,
    '--ml-radius-sm': '6px',
    '--ml-radius-md': '8px',
    '--ml-radius-lg': '8px',
    '--ml-radius-xl': '8px',
    '--ml-radius-xs': '4px',
    '--ml-icon-gap': '8px',
    '--ml-icon-label-gap': '12px',
    '--ml-page-padding': '24px',
    '--ml-card-padding': '16px',
    '--ml-toolbar-spacing': '12px',
    '--ml-component-spacing': '8px',
    '--ml-resource-sider-width': '232px',
    '--ml-glass-bg': isDark ? 'rgba(22,27,34,0.82)' : 'rgba(255,255,255,0.82)',
    '--ml-status-success-bg': isDark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.1)',
    '--ml-status-success-fg': isDark ? '#6ee7b7' : '#047857',
    '--ml-status-warning-bg': isDark ? 'rgba(251,191,36,0.12)' : 'rgba(217,119,6,0.1)',
    '--ml-status-warning-fg': isDark ? '#fcd34d' : '#b45309',
    '--ml-status-danger-bg': isDark ? 'rgba(248,113,113,0.12)' : 'rgba(220,38,38,0.1)',
    '--ml-status-danger-fg': isDark ? '#fca5a5' : '#b91c1c',
    '--ml-status-info-bg': isDark ? 'rgba(56,189,248,0.12)' : 'rgba(14,165,233,0.1)',
    '--ml-status-info-fg': isDark ? '#7dd3fc' : '#0369a1',
    '--ml-status-neutral-bg': isDark ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.08)',
    '--ml-status-neutral-fg': isDark ? '#94a3b8' : '#64748b',
    '--ml-status-orange-bg': isDark ? 'rgba(249,115,22,0.12)' : 'rgba(234,88,12,0.1)',
    '--ml-status-orange-fg': isDark ? '#fdba74' : '#c2410c',
    '--ml-font-sans': typography.fontSans,
    '--ml-font-mono': typography.fontMono
  }

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}
