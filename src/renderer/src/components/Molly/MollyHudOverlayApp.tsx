import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import { MollyVoiceHud, orbStateToHudPhase } from './MollyVoiceHud'
import { useMollyStore, selectActiveLines } from '../../stores/mollyStore'
import './mollyVoiceHud.css'
import './mollyHudOverlay.css'

/**
 * Standalone floating HUD route (`?mlMollyHud=1`) — runs voice in a separate
 * always-on-top BrowserWindow so Molly stays available in the background.
 */
export function MollyHudOverlayApp(): React.JSX.Element {
  const { t } = useTranslation()
  const orbState = useMollyStore((s) => s.orbState)
  const listening = useMollyStore((s) => s.listening)
  const busy = useMollyStore((s) => s.busy)
  const lines = useMollyStore((s) => selectActiveLines(s))
  const voiceActive = useMollyStore((s) => s.voiceActive)
  const voiceRms = useMollyStore((s) => s.voiceRms)
  const startListening = useMollyStore((s) => s.startListening)
  const finishListening = useMollyStore((s) => s.finishListening)
  const stopAll = useMollyStore((s) => s.stopAll)
  const [drag, setDrag] = useState(false)

  const lastSystem = useMemo(() => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i]?.role === 'system' || lines[i]?.role === 'assistant') return lines[i]!.text
    }
    return null
  }, [lines])

  const phase = orbStateToHudPhase(orbState, {
    listening,
    rms: voiceRms,
    busy,
    error: lastSystem && /error|başarısız|izin|denied|503|404/i.test(lastSystem) ? lastSystem : null
  })

  useEffect(() => {
    document.documentElement.classList.add('ml-molly-hud-root')
    document.body.classList.add('ml-molly-hud-root')
    return () => {
      document.documentElement.classList.remove('ml-molly-hud-root')
      document.body.classList.remove('ml-molly-hud-root')
    }
  }, [])

  return (
    <div className={`ml-molly-overlay${drag ? ' is-dragging' : ''}`}>
      <div
        className="ml-molly-overlay__chrome"
        onMouseDown={() => setDrag(true)}
        onMouseUp={() => setDrag(false)}
        onMouseLeave={() => setDrag(false)}
      >
        <span className="ml-molly-overlay__brand">Molly</span>
        <div className="ml-molly-overlay__chrome-actions">
          <button
            type="button"
            className="ml-molly-overlay__icon-btn"
            title={t('molly.openMollyPage')}
            onClick={() => {
              void window.api.molly.focusMain()
            }}
          >
            <Icon icon={ExternalLink} size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="ml-molly-overlay__icon-btn"
            title={t('molly.closeHud')}
            onClick={() => {
              useMollyStore.getState().patchSettings({ backgroundHud: false })
              void window.api.molly.closeHud()
            }}
          >
            <Icon icon={X} size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <MollyVoiceHud
        phase={phase}
        rms={voiceRms}
        caption={listening ? t('molly.hud.liveCaption') : lastSystem || undefined}
        listening={listening}
        voiceActive={voiceActive}
        busy={busy}
        onTalk={() => startListening()}
        onSend={() => finishListening()}
        onStop={() => stopAll()}
      />

      <div className="ml-molly-overlay__footer">
        <button
          type="button"
          className="ml-molly-overlay__open"
          onClick={() => {
            void window.api.molly.focusMain()
          }}
        >
          {t('molly.openMollyPage')}
        </button>
      </div>
    </div>
  )
}

export function isMollyHudRoute(): boolean {
  return new URLSearchParams(window.location.search).get('mlMollyHud') === '1'
}
