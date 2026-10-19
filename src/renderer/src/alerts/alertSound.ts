import type { AlertSoundId } from '@shared/localAlerts'

type Tone = { freq: number; dur: number; gap: number; type: OscillatorType }

const PATTERNS: Record<Exclude<AlertSoundId, 'off'>, Tone[]> = {
  soft: [{ freq: 520, dur: 0.09, gap: 0, type: 'sine' }],
  chime: [
    { freq: 660, dur: 0.08, gap: 0.05, type: 'sine' },
    { freq: 880, dur: 0.14, gap: 0, type: 'sine' }
  ],
  alarm: [
    { freq: 440, dur: 0.1, gap: 0.06, type: 'square' },
    { freq: 440, dur: 0.1, gap: 0.06, type: 'square' },
    { freq: 554, dur: 0.16, gap: 0, type: 'square' }
  ]
}

export function playAlertSound(id: AlertSoundId): void {
  if (id === 'off' || typeof window === 'undefined') return
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  const pattern = PATTERNS[id]
  const ctx = new AudioCtx()
  let at = ctx.currentTime + 0.02
  for (const tone of pattern) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = tone.type
    osc.frequency.value = tone.freq
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(id === 'alarm' ? 0.08 : 0.12, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(at)
    osc.stop(at + tone.dur + 0.02)
    at += tone.dur + tone.gap
  }
  window.setTimeout(() => void ctx.close(), Math.ceil((at + 0.2) * 1000))
}
