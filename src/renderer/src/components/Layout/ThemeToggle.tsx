import { Segmented, Tooltip } from 'antd'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../../stores/themeStore'
import type { ThemeMode } from '../../stores/themeStore'
import { Icon } from '../ui/Icon'

interface ThemeToggleProps {
  compact?: boolean
}

export function ThemeToggle({ compact = false }: ThemeToggleProps): React.JSX.Element {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  const control = (
    <Segmented
      className={compact ? 'ml-theme-toggle-compact' : 'ml-theme-toggle'}
      value={mode}
      onChange={(v) => setMode(v as ThemeMode)}
      options={[
        { value: 'light', icon: <Icon icon={Sun} variant="toolbar" /> },
        { value: 'dark', icon: <Icon icon={Moon} variant="toolbar" /> },
        { value: 'system', icon: <Icon icon={Monitor} variant="toolbar" /> }
      ]}
      size={compact ? 'small' : 'middle'}
      block={!compact}
    />
  )

  if (compact) return control
  return <Tooltip title="Theme">{control}</Tooltip>
}
