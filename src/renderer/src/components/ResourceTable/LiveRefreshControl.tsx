import { RefreshCw } from 'lucide-react'
import { Icon } from '../ui/Icon'

interface LiveRefreshControlProps {
  isFetching: boolean
  onManualRefresh: () => void
}

export function LiveRefreshControl({ isFetching, onManualRefresh }: LiveRefreshControlProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="ml-btn ml-btn--ghost"
      disabled={isFetching}
      onClick={onManualRefresh}
      aria-label="Refresh"
    >
      <Icon icon={RefreshCw} variant="detail" className={isFetching ? 'ml-icon-spin' : undefined} />
      <span>Refresh</span>
    </button>
  )
}
