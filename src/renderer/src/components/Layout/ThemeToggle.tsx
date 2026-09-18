import { Segmented, Tooltip } from 'antd'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from '../../stores/themeStore'
import type { ThemeMode } from '../../stores/themeStore'
import { Icon } from '../ui/Icon'

interface ThemeToggleProps {
  compact?: boolean
  labeled?: boolean
}

export function ThemeToggle({ compact = false, labeled = false }: ThemeToggleProps): React.JSX.Element {
  const { t } = useTranslation()
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  const control = (
    <Segmented
      className={compact ? 'ml-theme-toggle-compact' : 'ml-theme-toggle'}
      value={mode}
      onChange={(v) => setMode(v as ThemeMode)}
      options={
        labeled
          ? [
              { value: 'light', icon: <Icon icon={Sun} variant="toolbar" />, label: t('settings.appearance.modeLight') },
              { value: 'dark', icon: <Icon icon={Moon} variant="toolbar" />, label: t('settings.appearance.modeDark') },
              { value: 'system', icon: <Icon icon={Monitor} variant="toolbar" />, label: t('settings.appearance.modeSystem') }
            ]
          : [
              { value: 'light', icon: <Icon icon={Sun} variant="toolbar" /> },
              { value: 'dark', icon: <Icon icon={Moon} variant="toolbar" /> },
              { value: 'system', icon: <Icon icon={Monitor} variant="toolbar" /> }
            ]
      }
      size={compact ? 'small' : 'middle'}
      block={!compact}
    />
  )

  if (compact || labeled) return control
  return <Tooltip title={t('settings.appearance.modeTitle')}>{control}</Tooltip>
}
