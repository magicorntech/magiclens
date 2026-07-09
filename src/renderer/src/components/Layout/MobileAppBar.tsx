import { Button, Typography } from 'antd'
import { Menu } from 'lucide-react'
import { Icon } from '../ui/Icon'
import logo from '../../assets/logo.png'

interface MobileAppBarProps {
  onMenuClick: () => void
}

export function MobileAppBar({ onMenuClick }: MobileAppBarProps): React.JSX.Element {
  return (
    <header className="mobile-app-bar titlebar-drag-region">
      <Button
        className="titlebar-no-drag"
        type="text"
        icon={<Icon icon={Menu} variant="toolbar" />}
        aria-label="Open navigation"
        onClick={onMenuClick}
      />
      <div className="mobile-app-bar-brand">
        <img src={logo} alt="" width={22} height={22} style={{ borderRadius: 6 }} />
        <Typography.Text strong style={{ fontSize: 14 }}>
          MagicLens
        </Typography.Text>
      </div>
      <div style={{ width: 32 }} />
    </header>
  )
}
