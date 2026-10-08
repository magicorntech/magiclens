import { useEffect, useRef } from 'react'
import { Mic, MicOff, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MollyOrbState } from '@shared/types/molly'
import { Icon } from '../ui/Icon'
import './mollyVoiceHud.css'

export type MollyHudPhase =
  | 'listening'
  | 'user_speaking'
  | 'processing'
  | 'assistant_speaking'
  | 'sleeping'
  | 'error'

const TITLE_KEYS: Record<MollyHudPhase, string> = {
  listening: 'molly.hud.listeningTitle',
  user_speaking: 'molly.hud.userSpeakingTitle',
  processing: 'molly.hud.processingTitle',
  assistant_speaking: 'molly.hud.assistantTitle',
  sleeping: 'molly.hud.sleepingTitle',
  error: 'molly.hud.errorTitle'
}

const STATUS_KEYS: Record<MollyHudPhase, string> = {
  listening: 'molly.hud.listeningStatus',
  user_speaking: 'molly.hud.userSpeakingStatus',
  processing: 'molly.hud.processingStatus',
  assistant_speaking: 'molly.hud.assistantStatus',
  sleeping: 'molly.hud.sleepingStatus',
  error: 'molly.hud.errorStatus'
}

export function orbStateToHudPhase(
  orb: MollyOrbState,
  opts: { listening: boolean; rms: number; busy: boolean; error?: string | null }
): MollyHudPhase {
  if (opts.error) return 'error'
  if (opts.busy || orb === 'thinking') return 'processing'
  if (orb === 'speaking') return 'assistant_speaking'
  if (opts.listening && opts.rms > 0.05) return 'user_speaking'
  if (opts.listening || orb === 'listening') return 'listening'
  return 'sleeping'
}

interface MollyVoiceHudProps {
  phase: MollyHudPhase
  /** 0..1 live mic / playback level */
  rms: number
  caption?: string
  listening: boolean
  voiceActive: boolean
  busy: boolean
  /** `dock` = page conversation stage; `card` = floating overlay. */
  variant?: 'dock' | 'card'
  onTalk: () => void
  onSend: () => void
  onStop: () => void
}

export function MollyVoiceHud({
  phase,
  rms,
  caption,
  listening,
  voiceActive,
  busy,
  variant = 'card',
  onTalk,
  onSend,
  onStop
}: MollyVoiceHudProps): React.JSX.Element {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barsRef = useRef<number[]>(Array.from({ length: 32 }, () => 0.08))
  const phaseRef = useRef(phase)
  const rmsRef = useRef(rms)
  phaseRef.current = phase
  rmsRef.current = rms

  useEffect(() => {
    let raf = 0
    const draw = (): void => {
      const canvas = canvasRef.current
      if (!canvas) {
        raf = requestAnimationFrame(draw)
        return
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        raf = requestAnimationFrame(draw)
        return
      }

      const currentPhase = phaseRef.current
      const target = Math.min(1, Math.max(0, rmsRef.current))
      const synthetic =
        currentPhase === 'assistant_speaking'
          ? 0.35 + 0.45 * Math.abs(Math.sin(Date.now() / 160))
          : currentPhase === 'processing'
            ? 0.28 + 0.4 * Math.abs(Math.sin(Date.now() / 220))
            : currentPhase === 'listening'
              ? 0.1 + 0.06 * Math.abs(Math.sin(Date.now() / 700))
              : currentPhase === 'sleeping'
                ? 0.05
                : target

      const energy = currentPhase === 'user_speaking' ? Math.max(target, 0.12) : Math.max(synthetic, target * 0.85)

      barsRef.current = barsRef.current.map((v, i) => {
        const wave = energy * (0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 130 + i * 0.42)))
        return v * 0.7 + wave * 0.3
      })

      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w > 0 && h > 0) {
        const bw = Math.floor(w * dpr)
        const bh = Math.floor(h * dpr)
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw
          canvas.height = bh
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)

        const styles = getComputedStyle(canvas)
        const primary = styles.getPropertyValue('--hud-bar-a').trim() || '#5b8def'
        const secondary = styles.getPropertyValue('--hud-bar-b').trim() || '#2a4a7a'

        const bars = barsRef.current
        const gap = 2
        const barW = (w - gap * (bars.length - 1)) / bars.length
        const mid = h / 2
        for (let i = 0; i < bars.length; i++) {
          const amp = bars[i]! * (h * 0.4)
          const x = i * (barW + gap)
          const grad = ctx.createLinearGradient(0, mid - amp, 0, mid + amp)
          grad.addColorStop(0, primary)
          grad.addColorStop(1, secondary)
          ctx.fillStyle = grad
          ctx.globalAlpha = 0.95
          roundRect(ctx, x, mid - amp, barW, amp * 2, Math.min(2, barW / 2))
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  const canStop = listening || voiceActive || busy || phase === 'assistant_speaking'
  const status = caption?.trim() ? caption : t(STATUS_KEYS[phase])
  const energy = Math.min(1, Math.max(0, rms))
  const style = {
    '--hud-energy': String(0.2 + energy * 0.8)
  } as React.CSSProperties

  const presence = (
    <div className="ml-molly-presence" aria-hidden>
      <div className="ml-molly-presence__ring ml-molly-presence__ring--3" />
      <div className="ml-molly-presence__ring ml-molly-presence__ring--2" />
      <div className="ml-molly-presence__ring ml-molly-presence__ring--1" />
      <div className="ml-molly-presence__core">
        <span className="ml-molly-presence__mark">M</span>
        <canvas ref={canvasRef} className="ml-molly-presence__wave" />
      </div>
    </div>
  )

  if (variant === 'dock') {
    return (
      <div
        className={`ml-molly-hud ml-molly-hud--dock ml-molly-hud--${phase}`}
        style={style}
        role="status"
        aria-live="polite"
      >
        {presence}
        <div className="ml-molly-hud__dock-copy">
          <div className="ml-molly-hud__phase-pill">
            <span className="ml-molly-hud__dot" />
            <span>{t(TITLE_KEYS[phase])}</span>
          </div>
          <p className="ml-molly-hud__dock-status">{status}</p>
          <p className="ml-molly-hud__dock-hint">
            {phase === 'assistant_speaking'
              ? t('molly.hud.assistantHint')
              : phase === 'user_speaking' || phase === 'listening'
                ? t('molly.hud.listeningHint')
                : phase === 'processing'
                  ? t('molly.hud.processingHint')
                  : t('molly.hud.sleepingHint')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`ml-molly-hud ml-molly-hud--card ml-molly-hud--${phase}`}
      style={style}
      role="status"
      aria-live="polite"
    >
      <div className="ml-molly-hud__accent" />
      {presence}
      <div className="ml-molly-hud__title">{t(TITLE_KEYS[phase])}</div>
      <div className="ml-molly-hud__badge">
        <span className="ml-molly-hud__dot" />
        <span>{status}</span>
      </div>
      <div className="ml-molly-hud__actions">
        {!listening ? (
          <button
            type="button"
            className="ml-btn ml-btn--primary ml-molly-hud__btn"
            onClick={onTalk}
            disabled={busy}
          >
            <Icon icon={Mic} variant="detail" />
            <span>{t('molly.startListening')}</span>
          </button>
        ) : (
          <button type="button" className="ml-btn ml-btn--primary ml-molly-hud__btn" onClick={onSend}>
            <span>{t('molly.sendVoice')}</span>
          </button>
        )}
        <button
          type="button"
          className="ml-btn ml-btn--ghost ml-molly-hud__btn"
          onClick={onStop}
          disabled={!canStop}
        >
          <Icon icon={canStop ? Square : MicOff} variant="detail" />
          <span>{t('molly.stopAll')}</span>
        </button>
      </div>
    </div>
  )
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
