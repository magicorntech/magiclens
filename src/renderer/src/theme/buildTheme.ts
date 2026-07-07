import { theme as antdThemeApi } from 'antd'
import type { ThemeConfig } from 'antd'
import type { ColorSchemeId } from './schemes'
import { getSchemePalette } from './schemes'
import { withAlpha } from './colorUtils'

export function buildAntdTheme(
  isDark: boolean,
  colorScheme: ColorSchemeId = 'violet',
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
      borderRadius: 8,
      wireframe: false,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    },
    components: {
      Layout: {
        siderBg: p.resourceSiderBg,
        headerBg: p.bgContainer,
        bodyBg: p.bgLayout,
        triggerBg: p.resourceSiderBg
      },
      Menu: {
        darkItemBg: 'transparent',
        darkSubMenuItemBg: p.resourceSiderBg,
        darkItemSelectedBg: withAlpha(p.primary, isDark ? 0.18 : 0.22),
        darkItemHoverBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
        itemSelectedColor: isDark ? p.primary : '#ffffff',
        itemColor: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.82)'
      },
      Tabs: {
        cardBg: p.bgContainer,
        itemSelectedColor: p.primary
      },
      Table: {
        headerBg: p.bgSpotlight,
        rowHoverBg: p.selectionBg
      },
      Button: {
        primaryShadow: 'none'
      },
      Tag: {
        defaultBg: isDark ? p.bgElevated : p.bgSpotlight
      },
      Segmented: {
        trackBg: isDark ? p.bgElevated : p.borderSecondary
      }
    }
  }
}

/** Pushes palette values to CSS custom properties for non-antd surfaces (sidebar, terminal, panels). */
export function syncDocumentTheme(
  isDark: boolean,
  colorScheme: ColorSchemeId = 'violet',
  customAccent?: string
): void {
  const p = getSchemePalette(colorScheme, isDark, customAccent)
  const root = document.documentElement
  root.setAttribute('data-theme', isDark ? 'dark' : 'light')

  const vars: Record<string, string> = {
    '--ml-primary': p.primary,
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
    '--ml-shadow-sm': p.shadow,
    '--ml-selection-bg': p.selectionBg,
    '--ml-splash-accent': p.primary,
    '--ml-splash-accent-2': p.primaryHover
  }

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}
