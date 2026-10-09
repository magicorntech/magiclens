import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  MollyOrbState,
  MollySettings,
  MollyToolResult,
  MollyNavigateTarget
} from '@shared/types/molly'
import { DEFAULT_MOLLY_SETTINGS } from '@shared/types/molly'
import type { AiProviderConfig } from '@shared/types/aiAgent'
import { geminiRateLimitUserMessage, isGeminiRateLimitError } from '@shared/mollyModels'
import { useAiAgentStore, resolveActiveProvider } from './aiAgentStore'
import { useClusterStore } from './clusterStore'
import { MollyLiveSession } from '../ai/mollyLiveSession'
import { MollyWakeWord } from '../ai/mollyWakeWord'

export interface MollyChatLine {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  tools?: MollyToolResult[]
  at: number
}

export interface MollyChatThread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  lines: MollyChatLine[]
}

const MAX_CHATS = 40
const MAX_LINES_PER_CHAT = 200
const DEFAULT_CHAT_TITLE = 'New chat'

interface MollyState {
  settings: MollySettings
  orbState: MollyOrbState
  listening: boolean
  /** True while a voice turn is in progress (listen / think). */
  voiceActive: boolean
  /** Live mic level 0..1 while recording (for HUD waveform). */
  voiceRms: number
  chats: MollyChatThread[]
  activeChatId: string
  /** In-progress voice transcript, shown before the turn is committed. */
  liveDraftUser: string
  liveDraftAssistant: string
  /** Gemini Live socket is up — turns are continuous, not push-to-talk. */
  liveConnected: boolean
  busy: boolean
  patchSettings: (patch: Partial<MollySettings>) => void
  setOrbState: (s: MollyOrbState) => void
  clearTranscript: () => void
  /** Copy a legacy Copilot transcript in when the active Molly chat is still empty. */
  adoptLinesIfEmpty: (lines: MollyChatLine[]) => void
  createChat: () => string
  selectChat: (id: string) => void
  deleteChat: (id: string) => void
  renameChat: (id: string, title: string) => void
  resolveProvider: () => AiProviderConfig | null
  /** Optional TTS — on when voiceChat or speakReplies. */
  speak: (text: string) => Promise<void>
  sendText: (text: string, opts?: { fromVoice?: boolean; contextHint?: string }) => Promise<void>
  /** Start mic capture (push-to-talk). */
  startListening: () => void
  /** Finish capture and send to Molly. */
  finishListening: () => void
  /** Hard stop: mic + TTS + pending reply loop. Does NOT send audio. */
  stopAll: () => void
  applyNavigate: (target: MollyNavigateTarget) => void
}

let micStream: MediaStream | null = null
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: BlobPart[] = []
let silenceTimer: ReturnType<typeof setTimeout> | null = null
let analyserFrame = 0
/** When true, recorder.onstop must discard audio (user hit Stop). */
let cancelRecording = false
/** Stops the voice conversation loop (no auto re-listen / TTS after Stop). */
let abortVoiceLoop = false
let liveSession: MollyLiveSession | null = null
let wakeWord: MollyWakeWord | null = null
let wakeWordArmed = false
/** True while Gemini Live is connecting or open — blocks wake-word mic. */
let liveBusy = false
let wakeRearmTimer: ReturnType<typeof setTimeout> | null = null
let liveUserBuf = ''
let liveAssistantBuf = ''
let draftFrame = 0
let userHold: ReturnType<typeof setTimeout> | null = null
let assistantHold: ReturnType<typeof setTimeout> | null = null

function absorbTranscript(prev: string, chunk: string): string {
  if (!chunk) return prev
  const piece = chunk.replace(/[ \t]+/g, ' ')
  const trimmed = piece.trim()
  if (!trimmed) return prev
  if (!prev) return trimmed
  if (trimmed === prev || prev.endsWith(trimmed)) return prev
  // Live often resends the whole phrase so far. Replace instead of appending.
  if (trimmed.startsWith(prev)) return trimmed
  // Sub-word pieces ("Se" + "lam") must be glued. A leading space means a new word.
  const joined = /^\s/.test(piece) ? `${prev.trimEnd()} ${trimmed}` : `${prev}${trimmed}`
  return joined.replace(/([.!?])([A-Za-zÇĞİÖŞÜçğıöşü])/g, '$1 $2')
}

function publishLiveDrafts(set: MollySet): void {
  if (draftFrame) return
  draftFrame = requestAnimationFrame(() => {
    draftFrame = 0
    set(() => ({ liveDraftUser: liveUserBuf, liveDraftAssistant: liveAssistantBuf }))
  })
}

function commitLiveRole(set: MollySet, role: 'user' | 'assistant'): void {
  const hold = role === 'user' ? userHold : assistantHold
  if (hold) clearTimeout(hold)
  if (role === 'user') userHold = null
  else assistantHold = null
  const text = (role === 'user' ? liveUserBuf : liveAssistantBuf).trim()
  if (role === 'user') liveUserBuf = ''
  else liveAssistantBuf = ''
  if (!text) {
    set(() => (role === 'user' ? { liveDraftUser: '' } : { liveDraftAssistant: '' }))
    return
  }
  set((s) =>
    withActiveLines(
      s,
      (lines) => {
        const last = lines[lines.length - 1]
        if (last?.role === role && last.text === text) return lines
        return [...lines, { id: uid(), role, text, at: Date.now() }]
      },
      role === 'user' ? { liveDraftUser: '' } : { liveDraftAssistant: '' }
    )
  )
}

function holdLiveRole(set: MollySet, role: 'user' | 'assistant', ms: number): void {
  const prev = role === 'user' ? userHold : assistantHold
  if (prev) clearTimeout(prev)
  const timer = setTimeout(() => commitLiveRole(set, role), ms)
  if (role === 'user') userHold = timer
  else assistantHold = timer
}

function clearWakeRearm(): void {
  if (wakeRearmTimer != null) {
    clearTimeout(wakeRearmTimer)
    wakeRearmTimer = null
  }
}

function scheduleWakeRearm(delayMs = 2500): void {
  clearWakeRearm()
  wakeRearmTimer = setTimeout(() => {
    wakeRearmTimer = null
    if (!liveBusy && !liveSession?.isOpen) syncMollyWakeWord()
  }, delayMs)
}

type MollySet = (fn: (s: MollyState) => Partial<MollyState>) => void

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function clipTitle(text: string, max = 42): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return DEFAULT_CHAT_TITLE
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

function createEmptyChat(title = DEFAULT_CHAT_TITLE): MollyChatThread {
  const now = Date.now()
  return { id: uid(), title, createdAt: now, updatedAt: now, lines: [] }
}

export function selectActiveChat(state: {
  chats: MollyChatThread[]
  activeChatId: string
}): MollyChatThread | undefined {
  return state.chats.find((c) => c.id === state.activeChatId) ?? state.chats[0]
}

export function selectActiveLines(state: {
  chats: MollyChatThread[]
  activeChatId: string
}): MollyChatLine[] {
  return selectActiveChat(state)?.lines ?? []
}

function ensureChatState(state: MollyState): {
  chats: MollyChatThread[]
  activeChatId: string
} {
  let chats = state.chats
  let activeChatId = state.activeChatId
  if (chats.length === 0) {
    const chat = createEmptyChat()
    return { chats: [chat], activeChatId: chat.id }
  }
  if (!chats.some((c) => c.id === activeChatId)) {
    activeChatId = chats[0]!.id
  }
  return { chats, activeChatId }
}

/** Patch the active chat’s lines (and auto-title from first user message). */
function withActiveLines(
  state: MollyState,
  nextLines: MollyChatLine[] | ((lines: MollyChatLine[]) => MollyChatLine[]),
  extra: Partial<MollyState> = {}
): Partial<MollyState> {
  const base = ensureChatState(state)
  const current = base.chats.find((c) => c.id === base.activeChatId)?.lines ?? []
  const lines = (typeof nextLines === 'function' ? nextLines(current) : nextLines).slice(
    -MAX_LINES_PER_CHAT
  )
  const chats = base.chats.map((chat) => {
    if (chat.id !== base.activeChatId) return chat
    const hadUser = chat.lines.some((l) => l.role === 'user')
    const firstUser = lines.find((l) => l.role === 'user')
    const title =
      !hadUser && firstUser && (chat.title === DEFAULT_CHAT_TITLE || !chat.title.trim())
        ? clipTitle(firstUser.text)
        : chat.title
    return { ...chat, lines, title, updatedAt: Date.now() }
  })
  return { ...extra, chats, activeChatId: base.activeChatId }
}

function stopLiveSession(): void {
  liveBusy = false
  if (liveSession) {
    try {
      liveSession.stop()
    } catch {
      /* ignore */
    }
    liveSession = null
  }
}

function ensureWakeWord(get: () => MollyState, set: MollySet): void {
  const settings = get().settings
  if (!settings.wakeWord || !settings.micEnabled || !settings.voiceChat) {
    wakeWord?.stop()
    wakeWord = null
    wakeWordArmed = false
    return
  }
  // Never hold the mic for wake word while Live owns it (or is connecting).
  if (liveBusy || liveSession?.isOpen || get().listening) {
    wakeWord?.pause()
    return
  }
  if (!MollyWakeWord.supported()) return
  if (wakeWord && wakeWordArmed) {
    wakeWord.resume()
    return
  }
  wakeWord?.stop()
  wakeWord = new MollyWakeWord(
    {
      onWake: (remainder) => {
        get().startListening()
        if (remainder.length > 2) {
          window.setTimeout(() => {
            liveSession?.sendText(remainder)
          }, 1500)
        }
      },
      onError: (message) => pushSystem(set, message)
    },
    settings.voiceLocale
  )
  wakeWordArmed = true
  wakeWord.start()
}

export function syncMollyWakeWord(): void {
  ensureWakeWord(
    () => useMollyStore.getState(),
    (fn) => {
      useMollyStore.setState((s) => ({ ...s, ...fn(s) }))
    }
  )
}

function pushSystem(
  set: (fn: (s: MollyState) => Partial<MollyState>) => void,
  text: string
): void {
  set((s) =>
    withActiveLines(s, (lines) => [
      ...lines,
      { id: uid(), role: 'system', text, at: Date.now() }
    ])
  )
}

/** Short spoken summary — long bullet dumps are painful over TTS. */
function clipForSpeech(text: string, max = 320): string {
  const clean = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_`#>-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return `${(lastStop > 80 ? cut.slice(0, lastStop + 1) : cut).trim()}…`
}

const MIC_DENIED =
  'macOS mikrofon izni kapalı. Sistem Ayarları açıldı — Gizlilik ve Güvenlik → Mikrofon listesinde MagicLens’i aç.'

async function ensureMicAccess(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Mikrofon API bu pencerede yok.')
  }
  const gate = await window.api.molly.ensureMic()
  if (!gate.granted) throw new Error(MIC_DENIED)
  if (micStream && micStream.active) return micStream
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  })
  return micStream
}

function pickRecorderMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return 'audio/webm'
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Audio read failed'))
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(blob)
  })
}

function clearSilenceWatch(): void {
  if (silenceTimer) {
    clearTimeout(silenceTimer)
    silenceTimer = null
  }
  if (analyserFrame) {
    cancelAnimationFrame(analyserFrame)
    analyserFrame = 0
  }
}

function stopMicTracks(): void {
  if (micStream) {
    for (const track of micStream.getTracks()) track.stop()
    micStream = null
  }
}

function cancelSpeech(): void {
  try {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

function watchSilence(
  stream: MediaStream,
  onSilence: () => void,
  onRms: (rms: number) => void
): void {
  clearSilenceWatch()
  try {
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    let quietMs = 0
    let heardSpeech = false
    const started = Date.now()

    const tick = (): void => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i]! - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      onRms(Math.min(1, rms * 3.2))
      if (rms > 0.04) {
        heardSpeech = true
        quietMs = 0
      } else if (heardSpeech) {
        quietMs += 100
        if (quietMs >= 1200) {
          void ctx.close().catch(() => {})
          onSilence()
          return
        }
      }
      if (Date.now() - started > 20_000) {
        void ctx.close().catch(() => {})
        onSilence()
        return
      }
      silenceTimer = setTimeout(() => {
        analyserFrame = requestAnimationFrame(tick)
      }, 100)
    }
    analyserFrame = requestAnimationFrame(tick)
  } catch {
    silenceTimer = setTimeout(onSilence, 6_000)
  }
}

export const useMollyStore = create<MollyState>()(
  persist(
    (set, get) => {
      const bootstrap = createEmptyChat()
      return {
      settings: { ...DEFAULT_MOLLY_SETTINGS, startup: { ...DEFAULT_MOLLY_SETTINGS.startup } },
      orbState: 'idle',
      listening: false,
      voiceActive: false,
      voiceRms: 0,
      chats: [bootstrap],
      activeChatId: bootstrap.id,
      liveDraftUser: '',
      liveDraftAssistant: '',
      liveConnected: false,
      busy: false,

      patchSettings: (patch) => {
        set((s) => {
          const nextVoiceChat =
            patch.voiceChat ?? s.settings.voiceChat ?? DEFAULT_MOLLY_SETTINGS.voiceChat
          const nextLive = patch.geminiLive ?? s.settings.geminiLive ?? true
          // Turning Live on forces OS TTS off so only one voice speaks.
          const nextSpeak =
            nextLive !== false
              ? false
              : (patch.speakReplies ??
                s.settings.speakReplies ??
                DEFAULT_MOLLY_SETTINGS.speakReplies)
          return {
            settings: {
              ...DEFAULT_MOLLY_SETTINGS,
              ...s.settings,
              ...patch,
              voiceChat: nextVoiceChat,
              geminiLive: nextLive,
              speakReplies: nextSpeak,
              liveModel: patch.liveModel ?? s.settings.liveModel ?? DEFAULT_MOLLY_SETTINGS.liveModel,
              wakeWord: patch.wakeWord ?? s.settings.wakeWord ?? true,
              backgroundHud: patch.backgroundHud ?? s.settings.backgroundHud ?? false,
              startup: {
                ...DEFAULT_MOLLY_SETTINGS.startup,
                ...s.settings.startup,
                ...(patch.startup ?? {})
              }
            }
          }
        })
        window.setTimeout(() => syncMollyWakeWord(), 0)
      },

      setOrbState: (orbState) => set({ orbState }),

      clearTranscript: () =>
        set((s) => withActiveLines(s, [], {})),

      adoptLinesIfEmpty: (incoming) => {
        const usable = incoming.filter((l) => l.text.trim())
        if (usable.length === 0) return
        const current = selectActiveLines(get())
        if (current.some((l) => l.role === 'user' || l.role === 'assistant')) return
        set((s) => withActiveLines(s, usable))
      },

      createChat: () => {
        const chat = createEmptyChat()
        set((s) => {
          const chats = [chat, ...s.chats].slice(0, MAX_CHATS)
          return { chats, activeChatId: chat.id }
        })
        return chat.id
      },

      selectChat: (id) => {
        const exists = get().chats.some((c) => c.id === id)
        if (!exists) return
        set({ activeChatId: id })
      },

      deleteChat: (id) => {
        set((s) => {
          const remaining = s.chats.filter((c) => c.id !== id)
          if (remaining.length === 0) {
            const chat = createEmptyChat()
            return { chats: [chat], activeChatId: chat.id }
          }
          const activeChatId =
            s.activeChatId === id ? remaining[0]!.id : s.activeChatId
          return { chats: remaining, activeChatId }
        })
      },

      renameChat: (id, title) => {
        const next = title.trim() || DEFAULT_CHAT_TITLE
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === id ? { ...c, title: clipTitle(next, 60), updatedAt: Date.now() } : c
          )
        }))
      },

      resolveProvider: () => {
        const ai = useAiAgentStore.getState()
        const settings = get().settings
        if (settings.preferGemini) {
          const gemini = ai.providers.find((p) => p.id === 'gemini' && p.credential.trim())
          if (gemini) return gemini
        }
        return resolveActiveProvider(ai)
      },

      speak: (text) =>
        new Promise((resolve) => {
          const settings = get().settings
          // Gemini Live already speaks natively — never layer OS TTS on top.
          if (settings.geminiLive !== false || liveSession?.isOpen) {
            resolve()
            return
          }
          if (!settings.voiceChat && !settings.speakReplies) {
            resolve()
            return
          }
          if (!text.trim() || typeof speechSynthesis === 'undefined') {
            resolve()
            return
          }
          cancelSpeech()
          const spoken = clipForSpeech(text)
          const u = new SpeechSynthesisUtterance(spoken)
          u.lang = settings.voiceLocale || 'tr-TR'
          const voices = speechSynthesis.getVoices()
          const langPrefix = u.lang.slice(0, 2).toLowerCase()
          const match =
            voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix) && v.localService) ||
            voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix))
          if (match) u.voice = match
          const done = (): void => {
            set({ orbState: 'idle', voiceActive: false })
            resolve()
          }
          u.onstart = () => set({ orbState: 'speaking', voiceActive: true })
          u.onend = done
          u.onerror = done
          // Voices may load async on Chromium — retry once.
          const kick = (): void => {
            try {
              speechSynthesis.speak(u)
            } catch {
              done()
            }
          }
          if (voices.length === 0) {
            speechSynthesis.addEventListener('voiceschanged', kick, { once: true })
            window.setTimeout(kick, 250)
          } else {
            window.setTimeout(kick, 40)
          }
        }),

      sendText: async (text, opts) => {
        const trimmed = text.trim()
        if (!trimmed || get().busy) return

        // If a Live session is already open, send as realtime text (keeps Gemini Live chat).
        if (liveSession?.isOpen) {
          set((s) =>
            withActiveLines(
              s,
              (lines) => [...lines, { id: uid(), role: 'user', text: trimmed, at: Date.now() }],
              { orbState: 'listening', voiceActive: true }
            )
          )
          const hinted = opts?.contextHint
            ? `Context: ${opts.contextHint}\nUser: ${trimmed}`
            : trimmed
          liveSession.sendText(hinted)
          return
        }

        const fromVoice = Boolean(opts?.fromVoice)
        const provider = get().resolveProvider()
        if (!provider) {
          pushSystem(set, 'AI provider yok. Settings → AI Agent içine Gemini API key ekle.')
          return
        }

        set((s) =>
          withActiveLines(
            s,
            (lines) => [...lines, { id: uid(), role: 'user', text: trimmed, at: Date.now() }],
            { busy: true, voiceActive: true, orbState: 'thinking' }
          )
        )

        const history = selectActiveLines(get())
          .filter((l) => l.role === 'user' || l.role === 'assistant')
          .slice(-10)
          .map((l) => ({ role: l.role as 'user' | 'assistant', content: l.text }))

        try {
          const res = await window.api.molly.turn({
            text: trimmed,
            provider,
            cliWorkdir: useAiAgentStore.getState().cliWorkdir,
            history,
            activeClusterId: useClusterStore.getState().activeClusterId,
            contextHint: opts?.contextHint
          })
          if (!res.ok) {
            set((s) =>
              withActiveLines(
                s,
                (lines) => [
                  ...lines,
                  {
                    id: uid(),
                    role: 'system',
                    text: res.error ?? 'Molly turn failed',
                    at: Date.now()
                  }
                ],
                { busy: false, voiceActive: false, orbState: 'idle' }
              )
            )
            return
          }
          const reply = res.reply?.trim() || 'Tamam.'
          set((s) =>
            withActiveLines(
              s,
              (lines) => [
                ...lines,
                {
                  id: uid(),
                  role: 'assistant',
                  text: reply,
                  tools: res.toolResults,
                  at: Date.now()
                }
              ],
              { busy: false, voiceActive: false, orbState: 'idle' }
            )
          )
          if (res.navigate) get().applyNavigate(res.navigate)

          const settings = get().settings
          // Live owns audio. Classic OS TTS only when Live is off and user opted in.
          const shouldSpeak =
            !abortVoiceLoop &&
            settings.geminiLive === false &&
            (settings.speakReplies || (fromVoice && settings.voiceChat))
          if (shouldSpeak) {
            await get().speak(reply)
          }

          // Keep the conversation going after a classic voice turn (not Live).
          if (
            fromVoice &&
            settings.voiceChat &&
            settings.geminiLive === false &&
            !abortVoiceLoop &&
            !get().listening &&
            !get().busy
          ) {
            window.setTimeout(() => {
              if (!abortVoiceLoop && settings.voiceChat && !get().listening && !get().busy) {
                get().startListening()
              }
            }, 350)
          }
        } catch (err) {
          set((s) =>
            withActiveLines(
              s,
              (lines) => [
                ...lines,
                {
                  id: uid(),
                  role: 'system',
                  text: err instanceof Error ? err.message : String(err),
                  at: Date.now()
                }
              ],
              { busy: false, voiceActive: false, orbState: 'idle' }
            )
          )
        }
      },

      stopAll: () => {
        abortVoiceLoop = true
        cancelRecording = true
        clearSilenceWatch()
        cancelSpeech()
        stopLiveSession()
        wakeWord?.pause()
        const recorder = mediaRecorder
        mediaRecorder = null
        if (recorder && recorder.state !== 'inactive') {
          try {
            recorder.ondataavailable = null
            recorder.onerror = null
            recorder.onstop = () => {
              recordedChunks = []
            }
            recorder.stop()
          } catch {
            /* ignore */
          }
        }
        recordedChunks = []
        stopMicTracks()
        const pendingUser = liveUserBuf.trim()
        const pendingAssistant = liveAssistantBuf.trim()
        liveUserBuf = ''
        liveAssistantBuf = ''
        set((s) => {
          const extra: MollyChatLine[] = []
          if (pendingUser) extra.push({ id: uid(), role: 'user', text: pendingUser, at: Date.now() })
          if (pendingAssistant) {
            extra.push({ id: uid(), role: 'assistant', text: pendingAssistant, at: Date.now() })
          }
          const base =
            extra.length > 0 ? withActiveLines(s, (lines) => [...lines, ...extra]) : {}
          return {
            ...base,
            listening: false,
            voiceActive: false,
            voiceRms: 0,
            busy: false,
            orbState: 'idle',
            liveDraftUser: '',
            liveDraftAssistant: '',
            liveConnected: false
          }
        })
        scheduleWakeRearm(2500)
      },

      finishListening: () => {
        // audioStreamEnd closes the Live mic and the next audio is rejected.
        if (liveSession?.isOpen || get().liveConnected) return
        clearSilenceWatch()
        cancelRecording = false
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          try {
            mediaRecorder.stop()
          } catch {
            get().stopAll()
          }
          return
        }
        set({ listening: false, voiceActive: false, voiceRms: 0, orbState: 'idle' })
      },

      startListening: () => {
        if (get().listening && liveSession?.isOpen) return
        if (!get().settings.micEnabled) {
          pushSystem(set, 'Mikrofon Molly ayarlarında kapalı.')
          return
        }

        const provider = get().resolveProvider()
        if (!provider || provider.id !== 'gemini' || !provider.credential.trim()) {
          pushSystem(
            set,
            'Sesli komut için Settings → AI Agent içinde Google Gemini API key gerekli.'
          )
          return
        }

        cancelRecording = false
        abortVoiceLoop = false
        // Cancel any leftover OS TTS from earlier sessions (Live-only audio).
        cancelSpeech()
        if (typeof speechSynthesis !== 'undefined') {
          try {
            speechSynthesis.cancel()
          } catch {
            /* ignore */
          }
        }
        stopLiveSession()
        clearWakeRearm()
        wakeWord?.stop()
        const preferLive = get().settings.geminiLive !== false

        void (async () => {
          const gate = await window.api.molly.ensureMic()
          if (!gate.granted) {
            pushSystem(set, MIC_DENIED)
            set({ listening: false, voiceActive: false, orbState: 'idle' })
            return
          }
          if (preferLive) {
            try {
              stopLiveSession()
              liveBusy = true
              liveUserBuf = ''
              liveAssistantBuf = ''
              set({
                listening: true,
                voiceActive: true,
                voiceRms: 0,
                orbState: 'listening',
                busy: false
              })
              const session = new MollyLiveSession({
                onStatus: (status) => {
                  if (status === 'speaking') {
                    cancelSpeech()
                    if (get().orbState !== 'speaking') {
                      set({ orbState: 'speaking', listening: true, voiceActive: true, liveConnected: true })
                    }
                  } else if (status === 'listening' || status === 'ready') {
                    const cur = get()
                    if (cur.orbState === 'listening' && cur.liveConnected && cur.listening) return
                    set({
                      orbState: 'listening',
                      listening: true,
                      voiceActive: true,
                      liveConnected: true
                    })
                  } else if (status === 'connecting')
                    set({ orbState: 'thinking', listening: true, voiceActive: true })
                  else if (status === 'closed' || status === 'error') {
                    liveBusy = false
                    set({
                      orbState: 'idle',
                      listening: false,
                      voiceActive: false,
                      busy: false,
                      voiceRms: 0,
                      liveConnected: false
                    })
                  }
                },
                onLevel: (rms, source) => {
                  const cur = get()
                  if (Math.abs(cur.voiceRms - rms) < 0.04) return
                  if (source === 'playback' && cur.orbState === 'speaking') {
                    set({ voiceRms: rms })
                    return
                  }
                  if (source === 'mic' && (cur.orbState === 'listening' || cur.orbState === 'idle')) {
                    set({ voiceRms: rms })
                  }
                },
                onUserTranscript: (text, final) => {
                  if (text.trim()) {
                    liveUserBuf = absorbTranscript(liveUserBuf, text)
                    if (userHold) {
                      clearTimeout(userHold)
                      userHold = null
                    }
                  }
                  publishLiveDrafts(set)
                  if (final && liveUserBuf) holdLiveRole(set, 'user', 320)
                },
                onAssistantTranscript: (text, final) => {
                  if (text.trim()) {
                    liveAssistantBuf = absorbTranscript(liveAssistantBuf, text)
                    if (assistantHold) {
                      clearTimeout(assistantHold)
                      assistantHold = null
                    }
                  }
                  publishLiveDrafts(set)
                  if (final && liveAssistantBuf) holdLiveRole(set, 'assistant', 320)
                },
                onToolResult: (result) => {
                  if (result.navigate) get().applyNavigate(result.navigate)
                  set((s) => {
                    const lines = selectActiveLines(s)
                    const last = lines[lines.length - 1]
                    if (last?.role === 'assistant') {
                      const tools = [...(last.tools ?? []), result]
                      return withActiveLines(s, [...lines.slice(0, -1), { ...last, tools }])
                    }
                    return withActiveLines(s, [
                      ...lines,
                      {
                        id: uid(),
                        role: 'assistant',
                        text: result.summary,
                        tools: [result],
                        at: Date.now()
                      }
                    ])
                  })
                },
                onError: (message) => pushSystem(set, message),
                onClosed: () => {
                  liveBusy = false
                  liveSession = null
                  if (userHold || liveUserBuf) commitLiveRole(set, 'user')
                  if (assistantHold || liveAssistantBuf) commitLiveRole(set, 'assistant')
                  set({
                    listening: false,
                    voiceActive: false,
                    orbState: 'idle',
                    busy: false,
                    liveConnected: false
                  })
                  if (!abortVoiceLoop) scheduleWakeRearm(3000)
                }
              })
              liveSession = session
              await session.start({
                apiKey: provider.credential,
                voiceLocale: get().settings.voiceLocale,
                liveModel: get().settings.liveModel
              })
              set({ liveConnected: true, listening: true, voiceActive: true, orbState: 'listening' })
              return
            } catch (err) {
              liveBusy = false
              stopLiveSession()
              const raw = err instanceof Error ? err.message : String(err)
              if (isGeminiRateLimitError(raw)) {
                pushSystem(set, geminiRateLimitUserMessage(raw))
                set({ listening: false, voiceActive: false, orbState: 'idle' })
                if (!abortVoiceLoop) scheduleWakeRearm(4000)
                return
              }
              pushSystem(
                set,
                `Gemini Live açılamadı — klasik moda düşülüyor. ${raw}`
              )
              // fall through to MediaRecorder path
            }
          }

          if (typeof MediaRecorder === 'undefined') {
            pushSystem(set, 'Bu ortamda ses kaydı desteklenmiyor. Yazarak sor.')
            set({ listening: false, voiceActive: false, orbState: 'idle' })
            return
          }

          try {
            const stream = await ensureMicAccess()
            const mimeType = pickRecorderMime()
            recordedChunks = []
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
            mediaRecorder = recorder

            recorder.ondataavailable = (ev) => {
              if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data)
            }

            recorder.onerror = () => {
              pushSystem(set, 'Mikrofon kaydı hata verdi.')
              get().stopAll()
            }

            recorder.onstop = () => {
              void (async () => {
                clearSilenceWatch()
                const discarded = cancelRecording
                cancelRecording = false
                const chunks = recordedChunks
                recordedChunks = []
                mediaRecorder = null

                if (discarded) {
                  set({ listening: false, voiceActive: false, voiceRms: 0, orbState: 'idle' })
                  return
                }

                set({ listening: false, voiceActive: true, voiceRms: 0, orbState: 'thinking' })
                const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
                if (blob.size < 800) {
                  pushSystem(set, 'Ses algılanamadı — Sohbet başlat’a bas, sorunu söyle.')
                  set({ voiceActive: false, orbState: 'idle' })
                  return
                }

                try {
                  const base64 = await blobToBase64(blob)
                  const providerNow = get().resolveProvider()
                  if (!providerNow) {
                    pushSystem(set, 'Gemini API key kayboldu.')
                    set({ voiceActive: false, orbState: 'idle' })
                    return
                  }
                  const transcribed = await window.api.molly.transcribe({
                    provider: providerNow,
                    mimeType: blob.type || mimeType || 'audio/webm',
                    base64,
                    locale: get().settings.voiceLocale
                  })
                  if (!transcribed.ok) {
                    pushSystem(set, transcribed.error || 'Konuşma yazıya çevrilemedi.')
                    set({ voiceActive: false, orbState: 'idle' })
                    return
                  }
                  const text = (transcribed.text || '').trim()
                  if (!text) {
                    pushSystem(set, 'Anlaşılamadı — tekrar dene.')
                    set({ voiceActive: false, orbState: 'idle' })
                    return
                  }
                  await get().sendText(text, { fromVoice: true })
                } catch (err) {
                  pushSystem(set, err instanceof Error ? err.message : String(err))
                  set({ voiceActive: false, orbState: 'idle' })
                }
              })()
            }

            recorder.start(250)
            set({ listening: true, voiceActive: true, voiceRms: 0, orbState: 'listening' })
            watchSilence(
              stream,
              () => {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                  get().finishListening()
                }
              },
              (level) => set({ voiceRms: level })
            )
          } catch (err) {
            pushSystem(
              set,
              err instanceof Error
                ? err.message
                : 'Mikrofon izni yok. Sistem Ayarları → Gizlilik → Mikrofon’dan MagicLens’e izin ver.'
            )
            stopMicTracks()
            set({ listening: false, voiceActive: false, orbState: 'idle' })
          }
        })()
      },

      applyNavigate: () => {
        // Molly stays in chat — it does not open resource tabs or app views.
      }
    }
    },
    {
      name: 'magiclens-molly',
      partialize: (s) => ({
        settings: s.settings,
        chats: s.chats.slice(0, MAX_CHATS).map((c) => ({
          ...c,
          lines: c.lines.slice(-MAX_LINES_PER_CHAT)
        })),
        activeChatId: s.activeChatId
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MollyState> & {
          lines?: MollyChatLine[]
          lastFindings?: unknown
        }
        const settings = {
          ...DEFAULT_MOLLY_SETTINGS,
          ...(p.settings ?? {}),
          startup: {
            ...DEFAULT_MOLLY_SETTINGS.startup,
            ...(p.settings?.startup ?? {}),
            // Never auto-scan / inject findings into chat.
            enabled: false,
            speakOnIssues: false
          },
          voiceChat:
            p.settings != null && Object.prototype.hasOwnProperty.call(p.settings, 'voiceChat')
              ? Boolean(p.settings.voiceChat)
              : true,
          speakReplies: false,
          geminiLive: p.settings?.geminiLive ?? true,
          liveModel: p.settings?.liveModel ?? DEFAULT_MOLLY_SETTINGS.liveModel,
          // Default off — wake word thrashing opened/closed the mic continuously.
          wakeWord: p.settings?.wakeWord === true
        }

        let chats: MollyChatThread[] =
          Array.isArray(p.chats) && p.chats.length > 0
            ? p.chats.map((c) => ({
                id: c.id || uid(),
                title: c.title?.trim() || DEFAULT_CHAT_TITLE,
                createdAt: c.createdAt || Date.now(),
                updatedAt: c.updatedAt || c.createdAt || Date.now(),
                lines: Array.isArray(c.lines) ? c.lines.slice(-MAX_LINES_PER_CHAT) : []
              }))
            : []

        // Migrate legacy single-transcript persist → one chat thread.
        if (chats.length === 0 && Array.isArray(p.lines) && p.lines.length > 0) {
          const now = Date.now()
          const firstUser = p.lines.find((l) => l.role === 'user')
          chats = [
            {
              id: uid(),
              title: firstUser ? clipTitle(firstUser.text) : DEFAULT_CHAT_TITLE,
              createdAt: p.lines[0]?.at ?? now,
              updatedAt: p.lines[p.lines.length - 1]?.at ?? now,
              lines: p.lines.slice(-MAX_LINES_PER_CHAT)
            }
          ]
        }
        if (chats.length === 0) chats = [createEmptyChat()]

        const activeChatId =
          typeof p.activeChatId === 'string' && chats.some((c) => c.id === p.activeChatId)
            ? p.activeChatId
            : chats[0]!.id

        return {
          ...current,
          settings,
          chats,
          activeChatId
        }
      }
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== 'magiclens-molly' || !event.newValue) return
    try {
      const parsed = JSON.parse(event.newValue) as {
        state?: { chats?: MollyChatThread[]; activeChatId?: string }
      }
      const incomingChats = parsed.state?.chats
      const incomingId = parsed.state?.activeChatId
      if (!Array.isArray(incomingChats) || incomingChats.length === 0 || !incomingId) return
      const current = useMollyStore.getState()
      const byId = new Map(current.chats.map((chat) => [chat.id, chat]))
      for (const chat of incomingChats) {
        const prev = byId.get(chat.id)
        if (!prev || chat.updatedAt > prev.updatedAt || chat.lines.length > prev.lines.length) {
          byId.set(chat.id, chat)
        }
      }
      const chats = [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40)
      const activeChatId = chats.some((chat) => chat.id === current.activeChatId)
        ? current.activeChatId
        : chats.some((chat) => chat.id === incomingId)
          ? incomingId
          : chats[0]?.id
      if (!activeChatId) return
      if (
        activeChatId === current.activeChatId &&
        JSON.stringify(chats) === JSON.stringify(current.chats)
      ) {
        return
      }
      useMollyStore.setState({ chats, activeChatId })
    } catch {
      /* ignore malformed persist payload */
    }
  })
}
