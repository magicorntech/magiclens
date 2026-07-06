import { Segmented, Tooltip } from 'antd'
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useThemeStore } from '../../stores/themeStore'
import type { ThemeMode } from '../../stores/themeStore'

export function ThemeToggle(): React.JSX.Element {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  return (
    <Tooltip title="Theme">
      <Segmented
        value={mode}
        onChange={(v) => setMode(v as ThemeMode)}
        options={[
          { value: 'light', icon: <SunOutlined /> },
          { value: 'dark', icon: <MoonOutlined /> },
          { value: 'system', icon: <DesktopOutlined /> }
        ]}
        block
      />
    </Tooltip>
  )
}
