import type { MollyToolName, MollyToolResult } from '@shared/types/molly'
import {
  geminiRateLimitUserMessage,
  isGeminiRateLimitError,
  resolveMollyLiveModels
} from '@shared/mollyModels'
import { MOLLY_LIVE_SYSTEM, MOLLY_LIVE_TOOLS } from './mollyLiveTools'

export type MollyLiveStatus = 'connecting' | 'ready' | 'listening' | 'speaking' | 'closed' | 'error'

export interface MollyLiveCallbacks {
  onStatus: (status: MollyLiveStatus) => void
  onUserTranscript?: (text: string, final: boolean) => void
  onAssistantTranscript?: (text: string, final: boolean) => void
  onToolResult?: (result: MollyToolResult) => void
  /** Mic or playback loudness 0..1 for presence UI. */
  onLevel?: (rms: number, source: 'mic' | 'playback') => void
  onError?: (message: string) => void
  onClosed?: () => void
}

function wsUrl(apiKey: string): string {
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`
}

function floatTo16BitPcm(float32: Float32Array): ArrayBuffer {
  const buf = new ArrayBuffer(float32.length * 2)
  const view = new DataView(buf)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]!))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buf
}

/** Hardware AudioContext often ignores requested 16 kHz — downsample before Live. */
function downsampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate <= 16000 + 50 && inputRate >= 16000 - 50) return input
  const ratio = inputRate / 16000
  const outLen = Math.max(1, Math.floor(input.length / ratio))
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio
    const i0 = Math.floor(src)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const t = src - i0
    out[i] = input[i0]! * (1 - t) + input[i1]! * t
  }
  return out
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Int16Array(bytes.buffer)
}

function formatLiveError(raw: string, model: string): string {
  const msg = `${raw} (${model})`
  return isGeminiRateLimitError(msg) ? geminiRateLimitUserMessage(msg) : msg
}

/**
 * Gemini Live bidirectional audio session for Molly (K8s tools only).
 * Mic → PCM 16kHz → Live; model audio → AudioContext playback.
 */
export class MollyLiveSession {
  private ws: WebSocket | null = null
  private micStream: MediaStream | null = null
  private audioCtx: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private playCtx: AudioContext | null = null
  private playTime = 0
  private closed = false
  private setupDone = false
  private modelIndex = 0
  private models: string[] = []
  private apiKey = ''
  private voiceLocale = 'tr-TR'
  private cbs: MollyLiveCallbacks
  private lastLevelAt = 0
  private speakWatch: ReturnType<typeof setTimeout> | null = null

  constructor(cbs: MollyLiveCallbacks) {
    this.cbs = cbs
  }

  get isOpen(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN && !this.closed)
  }

  async start(opts: {
    apiKey: string
    voiceLocale?: string
    /** `auto` or a concrete Live model id. */
    liveModel?: string
  }): Promise<void> {
    this.apiKey = opts.apiKey.trim()
    this.voiceLocale = opts.voiceLocale || 'tr-TR'
    if (!this.apiKey) throw new Error('Gemini API key gerekli')
    this.closed = false
    this.modelIndex = 0
    this.models = resolveMollyLiveModels(opts.liveModel)
    await this.connectWithModel(this.models[0]!)
  }

  stop(): void {
    this.closed = true
    this.teardownMic()
    this.teardownPlayback()
    try {
      this.ws?.close()
    } catch {
      /* ignore */
    }
    this.ws = null
    this.setupDone = false
    this.cbs.onStatus('closed')
    this.cbs.onClosed?.()
  }

  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !text.trim()) return
    this.ws.send(JSON.stringify({ realtimeInput: { text: text.trim() } }))
  }

  /** Hint that the user paused — helps Live finalize the turn sooner. */
  endAudioTurn(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
  }

  private async connectWithModel(model: string): Promise<void> {
    this.cbs.onStatus('connecting')
    this.setupDone = false
    let lastServerError = ''
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl(this.apiKey))
      ws.binaryType = 'arraybuffer'
      this.ws = ws
      let settled = false

      const fail = (msg: string): void => {
        if (settled) return
        settled = true
        reject(new Error(formatLiveError(msg, model)))
      }

      ws.onopen = () => {
        const setup = {
          setup: {
            model: `models/${model}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Aoede' }
                }
              }
            },
            systemInstruction: { parts: [{ text: MOLLY_LIVE_SYSTEM }] },
            tools: MOLLY_LIVE_TOOLS,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            // Wait through short pauses so a sentence is not cut into fragments.
            realtimeInputConfig: {
              automaticActivityDetection: {
                startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
                endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
                prefixPaddingMs: 400,
                silenceDurationMs: 700
              }
            }
          }
        }
        ws.send(JSON.stringify(setup))
      }

      ws.onmessage = (ev) => {
        void (async () => {
          let msg: Record<string, unknown>
          try {
            const text =
              typeof ev.data === 'string'
                ? ev.data
                : ev.data instanceof ArrayBuffer
                  ? new TextDecoder().decode(ev.data)
                  : ev.data instanceof Blob
                    ? await ev.data.text()
                    : String(ev.data)
            msg = JSON.parse(text) as Record<string, unknown>
          } catch {
            return
          }
          const err = msg.error as { message?: string } | undefined
          if (err?.message) {
            lastServerError = err.message
            fail(err.message)
            try {
              ws.close()
            } catch {
              /* ignore */
            }
            return
          }
          await this.handleMessage(msg)
          if (!settled && this.setupDone) {
            settled = true
            resolve()
          }
        })()
      }

      ws.onerror = () => {
        fail(lastServerError || 'Live WebSocket engellendi veya ağ hatası')
      }
      ws.onclose = (e) => {
        if (!settled) {
          const detail = [lastServerError, e.reason, e.code ? `code ${e.code}` : '']
            .filter(Boolean)
            .join(' · ')
          fail(detail || 'Live kapandı')
          return
        }
        if (!this.closed) {
          this.cbs.onStatus('closed')
          this.cbs.onClosed?.()
        }
      }

      window.setTimeout(() => {
        if (!settled) fail('Live setup zaman aşımı')
      }, 12_000)
    }).catch(async (err) => {
      try {
        this.ws?.close()
      } catch {
        /* ignore */
      }
      this.ws = null
      const next = this.models[++this.modelIndex]
      const errMsg = err instanceof Error ? err.message : String(err)
      if (next && !this.closed) {
        await this.connectWithModel(next)
        return
      }
      this.cbs.onStatus('error')
      this.cbs.onError?.(errMsg)
      throw err instanceof Error ? err : new Error(errMsg)
    })

    if (this.closed) return
    await this.startMic()
    this.cbs.onStatus('listening')
  }

  private async handleMessage(msg: Record<string, unknown>): Promise<void> {
    if (msg.setupComplete !== undefined) {
      this.setupDone = true
      this.cbs.onStatus('ready')
      return
    }

    if (msg.toolCall && typeof msg.toolCall === 'object') {
      await this.handleToolCall(msg.toolCall as { functionCalls?: Array<Record<string, unknown>> })
      return
    }

    const serverContent = msg.serverContent as Record<string, unknown> | undefined
    if (!serverContent) return

    if (serverContent.interrupted) {
      this.teardownPlayback()
      this.cbs.onStatus('listening')
    }

    const inputTx = serverContent.inputTranscription as { text?: string; finished?: boolean } | undefined
    if (inputTx?.text) this.cbs.onUserTranscript?.(inputTx.text, Boolean(inputTx.finished))

    const outputTx = serverContent.outputTranscription as { text?: string; finished?: boolean } | undefined
    if (outputTx?.text) this.cbs.onAssistantTranscript?.(outputTx.text, Boolean(outputTx.finished))

    const modelTurn = serverContent.modelTurn as
      | { parts?: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }> }
      | undefined
    if (modelTurn?.parts) {
      for (const part of modelTurn.parts) {
        if (part.inlineData?.data) {
          this.cbs.onStatus('speaking')
          this.enqueuePcm(part.inlineData.data)
        }
      }
    }

    if (serverContent.turnComplete) {
      // Settle the line after trailing transcript chunks, without cutting playback.
      this.cbs.onUserTranscript?.('', true)
      this.cbs.onAssistantTranscript?.('', true)
    }
  }

  private async handleToolCall(toolCall: {
    functionCalls?: Array<Record<string, unknown>>
  }): Promise<void> {
    const calls = toolCall.functionCalls ?? []
    const functionResponses: Array<Record<string, unknown>> = []
    for (const fc of calls) {
      const name = String(fc.name || '')
      const id = String(fc.id || '')
      const args = (fc.args && typeof fc.args === 'object' ? fc.args : {}) as Record<string, unknown>
      try {
        const res = await window.api.molly.runTool({
          call: { name: name as MollyToolName, args }
        })
        if (res.ok && res.result) {
          this.cbs.onToolResult?.(res.result)
          functionResponses.push({
            name,
            id,
            response: {
              ok: res.result.ok,
              summary: res.result.summary,
              data: res.result.data
            }
          })
        } else {
          functionResponses.push({
            name,
            id,
            response: { ok: false, error: res.error || 'tool failed' }
          })
        }
      } catch (err) {
        functionResponses.push({
          name,
          id,
          response: { ok: false, error: err instanceof Error ? err.message : String(err) }
        })
      }
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ toolResponse: { functionResponses } }))
    }
  }

  private async startMic(): Promise<void> {
    this.teardownMic()
    const gate = await window.api.molly.ensureMic()
    if (!gate.granted) {
      throw new Error('macOS mikrofon izni kapalı. Sistem Ayarları açıldı — Mikrofon listesinde MagicLens’i aç.')
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    })
    this.micStream = stream
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    this.audioCtx = ctx
    if (ctx.state === 'suspended') await ctx.resume()
    const source = ctx.createMediaStreamSource(stream)
    this.source = source
    const processor = ctx.createScriptProcessor(2048, 1, 1)
    this.processor = processor
    const inputRate = ctx.sampleRate
    processor.onaudioprocess = (ev) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupDone || this.closed) return
      const input = ev.inputBuffer.getChannelData(0)
      const pcmFloat = downsampleTo16k(input, inputRate)
      const now = performance.now()
      if (now - this.lastLevelAt > 120 && this.cbs.onLevel) {
        this.lastLevelAt = now
        let sum = 0
        let n = 0
        for (let i = 0; i < pcmFloat.length; i += 8) {
          const v = pcmFloat[i]!
          sum += v * v
          n += 1
        }
        const rms = Math.min(1, Math.sqrt(sum / Math.max(1, n)) * 3.2)
        this.cbs.onLevel(rms, 'mic')
      }
      // Keep the mic closed while Molly is speaking so speaker echo does not cut her off.
      if (this.playCtx) {
        if (this.playCtx.state === 'suspended') void this.playCtx.resume()
        const remain = this.playTime - this.playCtx.currentTime
        if (remain > 8) this.playTime = this.playCtx.currentTime
        else if (remain > 0.12) return
      }
      const pcm = floatTo16BitPcm(pcmFloat)
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              data: arrayBufferToBase64(pcm),
              mimeType: 'audio/pcm;rate=16000'
            }
          }
        })
      )
    }
    source.connect(processor)
    const mute = ctx.createGain()
    mute.gain.value = 0
    processor.connect(mute)
    mute.connect(ctx.destination)
  }

  private enqueuePcm(b64: string): void {
    try {
      const samples = base64ToInt16(b64)
      const now = performance.now()
      if (this.cbs.onLevel && samples.length > 0 && now - this.lastLevelAt > 120) {
        this.lastLevelAt = now
        let sum = 0
        const step = Math.max(1, Math.floor(samples.length / 32))
        let n = 0
        for (let i = 0; i < samples.length; i += step) {
          const v = samples[i]! / 32768
          sum += v * v
          n += 1
        }
        const rms = Math.min(1, Math.sqrt(sum / Math.max(1, n)) * 2.4)
        this.cbs.onLevel(rms, 'playback')
      }
      if (!this.playCtx) {
        this.playCtx = new AudioContext({ sampleRate: 24000 })
        this.playTime = this.playCtx.currentTime
      }
      const ctx = this.playCtx
      if (ctx.state === 'suspended') void ctx.resume()
      const f32 = new Float32Array(samples.length)
      for (let i = 0; i < samples.length; i++) f32[i] = samples[i]! / 32768
      const buffer = ctx.createBuffer(1, f32.length, 24000)
      buffer.copyToChannel(f32, 0)
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(ctx.destination)
      const startAt = Math.max(ctx.currentTime, this.playTime)
      src.start(startAt)
      this.playTime = startAt + buffer.duration
      this.notePlaybackQueued()
    } catch {
      /* ignore decode glitches */
    }
  }

  /** Return to listening once queued speech has actually finished. */
  private notePlaybackQueued(): void {
    if (this.speakWatch) clearTimeout(this.speakWatch)
    const tick = (): void => {
      this.speakWatch = null
      const ctx = this.playCtx
      if (!ctx || this.closed) return
      if (ctx.state === 'suspended') void ctx.resume()
      const remain = this.playTime - ctx.currentTime
      if (remain <= 0.08 || remain > 12) {
        if (remain > 12) this.playTime = ctx.currentTime
        this.cbs.onStatus('listening')
        return
      }
      this.speakWatch = setTimeout(tick, Math.min(400, remain * 1000))
    }
    this.speakWatch = setTimeout(tick, 150)
  }

  private teardownMic(): void {
    try {
      this.processor?.disconnect()
      this.source?.disconnect()
    } catch {
      /* ignore */
    }
    this.processor = null
    this.source = null
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => {})
      this.audioCtx = null
    }
    if (this.micStream) {
      for (const t of this.micStream.getTracks()) t.stop()
      this.micStream = null
    }
  }

  private teardownPlayback(): void {
    if (this.speakWatch) clearTimeout(this.speakWatch)
    this.speakWatch = null
    this.playTime = 0
    if (this.playCtx) {
      void this.playCtx.close().catch(() => {})
      this.playCtx = null
    }
  }
}
