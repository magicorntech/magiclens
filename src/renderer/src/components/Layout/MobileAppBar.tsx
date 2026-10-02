import { Menu } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { NotesNotificationBell } from '../Notes/NotesNotificationBell'
import { AiAssistantToggleButton } from './AiAssistantPanel'
import logo from '../../assets/logo.png'

const IS_MAC = navigator.platform.includes('Mac')

interface MobileAppBarProps {
  onMenuClick: () => void
}

export function MobileAppBar({ onMenuClick }: MobileAppBarProps): React.JSX.Element {
  return (
    <header
      className={`mobile-app-bar titlebar-drag-region${IS_MAC ? ' mobile-app-bar--traffic' : ''}`}
    >
      <button
        type="button"
        className="ml-icon-btn ml-action-btn titlebar-no-drag"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <Icon icon={Menu} variant="toolbar" />
      </button>
      <div className="mobile-app-bar-actions titlebar-no-drag ml-chrome-actions__fixed">
        <span className="ml-chrome-actions__hit">
          <AiAssistantToggleButton />
        </span>
        <span className="ml-chrome-actions__hit">
          <NotesNotificationBell />
        </span>
        <span className="ml-chrome-actions__hit ml-chrome-brand" title="MagicLens" aria-label="MagicLens">
          <img src={logo} alt="" className="ml-chrome-brand__logo" draggable={false} />
        </span>
      </div>
    </header>
  )
}
