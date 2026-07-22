import { useEffect, useState } from 'react'
import { Tooltip } from 'antd'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'

export function FullscreenToggle(): React.JSX.Element {
  const { t } = useTranslation()
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void window.api.app.getFullscreen().then((res) => {
      if (!cancelled) setFullscreen(res.fullscreen)
    })
    const unsubscribe = window.api.app.onFullscreenChanged((payload) => {
      setFullscreen(payload.fullscreen)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  async function handleToggle(): Promise<void> {
    const res = await window.api.app.toggleFullscreen()
    setFullscreen(res.fullscreen)
  }

  const label = fullscreen ? t('chrome.exitFullscreen') : t('chrome.fullscreen')

  return (
    <Tooltip title={label}>
      <button
        type="button"
        className={`ml-icon-btn${fullscreen ? ' ml-icon-btn--active' : ''}`}
        aria-label={label}
        aria-pressed={fullscreen}
        onClick={() => void handleToggle()}
      >
        <Icon icon={fullscreen ? Minimize2 : Maximize2} variant="toolbar" />
      </button>
    </Tooltip>
  )
}
