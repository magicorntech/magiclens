import { Typography } from 'antd'
import { Menu } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { NotesNotificationBell } from '../Notes/NotesNotificationBell'
import logo from '../../assets/logo.png'

interface MobileAppBarProps {
  onMenuClick: () => void
}

export function MobileAppBar({ onMenuClick }: MobileAppBarProps): React.JSX.Element {
  return (
    <header className="mobile-app-bar titlebar-drag-region">
      <button
        type="button"
        className="ml-icon-btn ml-action-btn titlebar-no-drag"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Icon icon={Menu} variant="toolbar" />
      </button>
      <div className="mobile-app-bar-brand">
        <img src={logo} alt="" width={22} height={22} style={{ borderRadius: 6 }} />
        <Typography.Text strong style={{ fontSize: 14 }}>
          MagicLens
        </Typography.Text>
      </div>
      <div className="mobile-app-bar-actions titlebar-no-drag ml-chrome-actions__fixed">
        <span className="ml-chrome-actions__hit">
          <NotesNotificationBell />
        </span>
      </div>
    </header>
  )
}
