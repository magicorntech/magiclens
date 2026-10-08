/**
 * Lightweight wake-word listener for “Molly” using Web Speech API.
 * Restarts are heavily backoff’d — Chromium ends sessions often; naive restart
 * causes the macOS mic indicator to flicker open/closed continuously.
 */

export type WakeWordCallbacks = {
  onWake: (remainder: string) => void
  onError?: (message: string) => void
  onListeningChange?: (listening: boolean) => void
}

function SpeechCtor(): (new () => SpeechRecognition) | null {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const RESTART_MIN_MS = 2800

export class MollyWakeWord {
  private rec: SpeechRecognition | null = null
  private running = false
  private paused = false
  private cbs: WakeWordCallbacks
  private locale: string
  private restartTimer: number | null = null
  private lastStartAt = 0

  constructor(cbs: WakeWordCallbacks, locale = 'tr-TR') {
    this.cbs = cbs
    this.locale = locale
  }

  static supported(): boolean {
    return Boolean(SpeechCtor())
  }

  start(): void {
    const Ctor = SpeechCtor()
    if (!Ctor) {
      this.cbs.onError?.('Wake word bu ortamda desteklenmiyor.')
      return
    }
    this.clearRestart()
    this.stopRecognitionOnly()
    this.running = true
    this.paused = false
    this.begin(Ctor)
  }

  pause(): void {
    this.paused = true
    this.clearRestart()
    try {
      this.rec?.abort()
    } catch {
      /* ignore */
    }
    this.rec = null
    this.cbs.onListeningChange?.(false)
  }

  resume(): void {
    if (!this.running || !this.paused) return
    this.paused = false
    const Ctor = SpeechCtor()
    if (!Ctor) return
    this.scheduleRestart(Ctor, 600)
  }

  stop(): void {
    this.running = false
    this.paused = false
    this.clearRestart()
    this.stopRecognitionOnly()
    this.cbs.onListeningChange?.(false)
  }

  setLocale(locale: string): void {
    this.locale = locale
    if (this.running && !this.paused) {
      this.start()
    }
  }

  private begin(Ctor: new () => SpeechRecognition): void {
    if (!this.running || this.paused) return
    const now = Date.now()
    const wait = Math.max(0, RESTART_MIN_MS - (now - this.lastStartAt))
    if (wait > 0) {
      this.scheduleRestart(Ctor, wait)
      return
    }
    this.lastStartAt = now
    const rec = new Ctor()
    this.rec = rec
    rec.lang = this.locale || 'tr-TR'
    // continuous=true ends/restarts aggressively on Chromium → mic flicker.
    rec.continuous = false
    rec.interimResults = true
    rec.onstart = () => this.cbs.onListeningChange?.(true)
    rec.onend = () => {
      this.cbs.onListeningChange?.(false)
      this.rec = null
      if (this.running && !this.paused) {
        this.scheduleRestart(Ctor, RESTART_MIN_MS)
      }
    }
    rec.onerror = (ev) => {
      if (ev.error === 'aborted' || ev.error === 'no-speech' || ev.error === 'audio-capture') {
        return
      }
      if (ev.error === 'not-allowed') {
        this.cbs.onError?.('Mikrofon izni yok — wake word kapalı.')
        this.stop()
      }
    }
    rec.onresult = (ev) => {
      if (this.paused) return
      let chunk = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        chunk += ev.results[i]![0]?.transcript ?? ''
      }
      const text = chunk.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const hit = /\b(molly|moli|molli|moly)\b/i.test(text)
      if (!hit) return
      const after = text.split(/molly|moli|molli|moly/i).pop()?.trim() ?? ''
      this.pause()
      this.cbs.onWake(after.length > 2 ? after : '')
    }
    try {
      rec.start()
    } catch (err) {
      this.scheduleRestart(Ctor, RESTART_MIN_MS)
      if (err instanceof Error && /already started/i.test(err.message)) return
    }
  }

  private scheduleRestart(Ctor: new () => SpeechRecognition, delayMs: number): void {
    this.clearRestart()
    this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null
      if (this.running && !this.paused) this.begin(Ctor)
    }, delayMs)
  }

  private clearRestart(): void {
    if (this.restartTimer != null) {
      window.clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
  }

  private stopRecognitionOnly(): void {
    try {
      this.rec?.abort()
    } catch {
      /* ignore */
    }
    this.rec = null
  }
}
