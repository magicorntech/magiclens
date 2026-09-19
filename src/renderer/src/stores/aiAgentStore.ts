import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_AI_AGENT_SETTINGS,
  DEFAULT_AI_PROVIDERS,
  type AiAgentSettings,
  type AiProviderConfig,
  type AiProviderId,
  type AiProviderStatus
} from '@shared/types/aiAgent'
import type { AiChatTurn } from '@shared/types/aiChat'

export type AiChatRole = 'user' | 'assistant' | 'system'

export interface AiChatChecklistItem {
  id: string
  label: string
  status: 'none' | 'active' | 'rbac' | 'review' | 'done'
}

export interface AiChatBlock {
  type: 'text' | 'checklist' | 'yaml' | 'actions'
  text?: string
  title?: string
  items?: AiChatChecklistItem[]
  language?: string
  code?: string
  actions?: Array<{ id: string; label: string }>
}

export interface AiChatMessage {
  id: string
  role: AiChatRole
  createdAt: number
  blocks: AiChatBlock[]
}

export interface AiChatContextSnapshot {
  clusterId: string
  clusterName: string
  namespace: string
  kind: string | null
  virtualPage: string | null
  resourceName: string | null
}

interface AiAgentState extends AiAgentSettings {
  panelOpen: boolean
  messages: AiChatMessage[]
  sending: boolean
  lastError: string | null
  setHideAssistant: (hide: boolean) => void
  setPulseChromeIcon: (pulse: boolean) => void
  setCliWorkdir: (dir: string) => void
  setDefaultProvider: (id: AiProviderId | null) => void
  updateProvider: (id: AiProviderId, patch: Partial<Pick<AiProviderConfig, 'credential' | 'model' | 'enabled'>>) => void
  providerStatus: (id: AiProviderId) => AiProviderStatus
  readyCount: () => number
  setPanelOpen: (open: boolean) => void
  togglePanel: () => void
  clearMessages: () => void
  sendUserMessage: (text: string, ctx: AiChatContextSnapshot) => Promise<void>
}

function mergeProviders(stored: AiProviderConfig[] | undefined): AiProviderConfig[] {
  const byId = new Map((stored ?? []).map((p) => [p.id, p]))
  return DEFAULT_AI_PROVIDERS.map((base) => {
    const prev = byId.get(base.id)
    if (!prev) return { ...base }
    return {
      ...base,
      credential: prev.credential ?? base.credential,
      model: prev.model || base.model,
      enabled: prev.enabled ?? base.enabled
    }
  })
}

function statusFor(provider: AiProviderConfig): AiProviderStatus {
  if (provider.kind === 'API') return provider.credential.trim() ? 'Ready' : 'Needs key'
  if (provider.kind === 'LOCAL') return provider.credential.trim() ? 'Ready' : 'Needs key'
  return provider.credential.trim() ? 'Ready' : 'Not installed'
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function blocksToPlainText(blocks: AiChatBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === 'text') return b.text || ''
      if (b.type === 'yaml') return b.code ? `\`\`\`${b.language || 'yaml'}\n${b.code}\n\`\`\`` : ''
      if (b.type === 'checklist' && b.items) {
        return [b.title, ...b.items.map((i) => `- [${i.status}] ${i.label}`)].filter(Boolean).join('\n')
      }
      return ''
    })
    .filter(Boolean)
    .join('\n\n')
}

/** Split model markdown into text + fenced code blocks for the chat UI. */
export function parseAssistantContent(content: string): AiChatBlock[] {
  const blocks: AiChatBlock[] = []
  const fence = /```(\w+)?\n([\s\S]*?)```/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = fence.exec(content)) != null) {
    const before = content.slice(last, match.index).trim()
    if (before) blocks.push({ type: 'text', text: before })
    const language = (match[1] || 'text').toLowerCase()
    const code = match[2].replace(/\n$/, '')
    if (language === 'yaml' || language === 'yml') {
      blocks.push({ type: 'yaml', title: 'YAML', language: 'yaml', code })
    } else {
      blocks.push({
        type: 'text',
        text: `\`\`\`${language}\n${code}\n\`\`\``
      })
    }
    last = match.index + match[0].length
  }
  const rest = content.slice(last).trim()
  if (rest) blocks.push({ type: 'text', text: rest })
  if (blocks.length === 0) blocks.push({ type: 'text', text: content.trim() || '—' })
  return blocks
}

function buildSystemPrompt(ctx: AiChatContextSnapshot): string {
  return [
    'You are MagicLens Copilot, a Kubernetes assistant inside the MagicLens desktop app.',
    'Answer in the same language the user writes in (Turkish or English).',
    'Be concrete and practical. Prefer short sections, checklists, and YAML when helpful.',
    'Do not claim you already applied cluster changes — suggest reviewed patches only.',
    'Current UI context (use this; do not invent a different cluster):',
    `- Cluster: ${ctx.clusterName} (${ctx.clusterId})`,
    `- Namespace selection: ${ctx.namespace}`,
    `- Resource kind: ${ctx.kind || '—'}`,
    `- Virtual page: ${ctx.virtualPage || '—'}`,
    `- Focused resource: ${ctx.resourceName || '—'}`
  ].join('\n')
}

function resolveProvider(state: AiAgentState): AiProviderConfig | null {
  if (state.defaultProviderId) {
    const picked = state.providers.find((p) => p.id === state.defaultProviderId)
    if (picked) return picked
  }
  const ready = state.providers.find((p) => statusFor(p) === 'Ready')
  return ready ?? state.providers.find((p) => p.id === 'ollama') ?? state.providers[0] ?? null
}

export const useAiAgentStore = create<AiAgentState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_AI_AGENT_SETTINGS,
      providers: DEFAULT_AI_PROVIDERS.map((p) => ({ ...p })),
      panelOpen: true,
      messages: [],
      sending: false,
      lastError: null,
      setHideAssistant: (hideAssistant) => set({ hideAssistant, panelOpen: hideAssistant ? false : get().panelOpen }),
      setPulseChromeIcon: (pulseChromeIcon) => set({ pulseChromeIcon }),
      setCliWorkdir: (cliWorkdir) => set({ cliWorkdir }),
      setDefaultProvider: (defaultProviderId) => set({ defaultProviderId }),
      updateProvider: (id, patch) =>
        set((state) => ({
          providers: state.providers.map((p) => (p.id === id ? { ...p, ...patch } : p))
        })),
      providerStatus: (id) => {
        const provider = get().providers.find((p) => p.id === id)
        return provider ? statusFor(provider) : 'Not installed'
      },
      readyCount: () => get().providers.filter((p) => statusFor(p) === 'Ready').length,
      setPanelOpen: (panelOpen) => {
        if (get().hideAssistant) return
        set({ panelOpen })
      },
      togglePanel: () => {
        if (get().hideAssistant) return
        set((s) => ({ panelOpen: !s.panelOpen }))
      },
      clearMessages: () => set({ messages: [], lastError: null }),
      sendUserMessage: async (text, ctx) => {
        const trimmed = text.trim()
        if (!trimmed || get().sending) return

        const provider = resolveProvider(get())
        if (!provider) {
          set({ lastError: 'No AI provider configured.' })
          return
        }
        if (provider.kind === 'API' && !provider.credential.trim()) {
          set({
            lastError: `${provider.name} needs an API key — open Settings → AI Agent.`
          })
          return
        }
        if (provider.kind === 'LOCAL' && !provider.credential.trim()) {
          set({ lastError: 'Ollama host URL missing in Settings → AI Agent.' })
          return
        }

        const userMsg: AiChatMessage = {
          id: uid('user'),
          role: 'user',
          createdAt: Date.now(),
          blocks: [{ type: 'text', text: trimmed }]
        }

        const history: AiChatTurn[] = [
          { role: 'system', content: buildSystemPrompt(ctx) },
          ...get().messages.slice(-12).map((m) => ({
            role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
            content: blocksToPlainText(m.blocks)
          })),
          { role: 'user', content: trimmed }
        ]

        set((s) => ({
          messages: [...s.messages, userMsg],
          sending: true,
          panelOpen: true,
          lastError: null
        }))

        try {
          const res = await window.api.ai.chatComplete({
            provider,
            messages: history,
            cliWorkdir: get().cliWorkdir
          })
          if (!res.ok) {
            const errMsg: AiChatMessage = {
              id: uid('asst'),
              role: 'assistant',
              createdAt: Date.now(),
              blocks: [
                {
                  type: 'text',
                  text: `Model yanıt veremedi (${provider.name} · ${provider.model}):\n${res.error}`
                },
                {
                  type: 'actions',
                  actions: [{ id: 'settings', label: 'AI settings' }]
                }
              ]
            }
            set((s) => ({
              messages: [...s.messages, errMsg],
              sending: false,
              lastError: res.error
            }))
            return
          }

          const assistantMsg: AiChatMessage = {
            id: uid('asst'),
            role: 'assistant',
            createdAt: Date.now(),
            blocks: [
              ...parseAssistantContent(res.content),
              {
                type: 'actions',
                actions: [
                  { id: 'open-security', label: 'Open Security' },
                  { id: 'settings', label: 'AI settings' }
                ]
              }
            ]
          }
          set((s) => ({ messages: [...s.messages, assistantMsg], sending: false, lastError: null }))
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          set((s) => ({
            messages: [
              ...s.messages,
              {
                id: uid('asst'),
                role: 'assistant',
                createdAt: Date.now(),
                blocks: [{ type: 'text', text: `İstek başarısız: ${message}` }]
              }
            ],
            sending: false,
            lastError: message
          }))
        }
      }
    }),
    {
      name: 'magiclens-ai-agent',
      version: 3,
      partialize: (state) => ({
        defaultProviderId: state.defaultProviderId,
        hideAssistant: state.hideAssistant,
        pulseChromeIcon: state.pulseChromeIcon,
        cliWorkdir: state.cliWorkdir,
        providers: state.providers,
        panelOpen: state.panelOpen
      }),
      migrate: (persisted, version) => {
        const raw = (persisted ?? {}) as Partial<AiAgentSettings> & { panelOpen?: boolean }
        if (version < 2) {
          return {
            ...raw,
            hideAssistant: false,
            pulseChromeIcon: true,
            panelOpen: true
          }
        }
        if (version < 3) {
          return {
            ...raw,
            pulseChromeIcon: true
          }
        }
        return raw
      },
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as Partial<AiAgentSettings> & { panelOpen?: boolean }
        return {
          ...current,
          defaultProviderId: raw.defaultProviderId ?? current.defaultProviderId,
          hideAssistant: raw.hideAssistant ?? current.hideAssistant,
          pulseChromeIcon: raw.pulseChromeIcon ?? current.pulseChromeIcon,
          cliWorkdir: raw.cliWorkdir ?? current.cliWorkdir,
          providers: mergeProviders(raw.providers),
          panelOpen: raw.hideAssistant ? false : (raw.panelOpen ?? current.panelOpen)
        }
      }
    }
  )
)

export function aiProviderCredentialLabel(kind: AiProviderConfig['kind']): string {
  if (kind === 'API') return 'API key'
  if (kind === 'LOCAL') return 'Host URL'
  return 'Command'
}

export const AI_MODEL_OPTIONS: Record<AiProviderId, string[]> = {
  openai: ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  claude: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'],
  ollama: ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5', 'codellama'],
  'claude-cli': ['sonnet', 'opus', 'haiku'],
  codex: ['default'],
  copilot: ['default'],
  gemini: ['default', 'gemini-2.5-pro', 'gemini-2.5-flash']
}

export function resolveActiveProvider(
  state: Pick<AiAgentState, 'defaultProviderId' | 'providers'>
): AiProviderConfig | null {
  const id = state.defaultProviderId
  if (id) return state.providers.find((p) => p.id === id) ?? null
  return state.providers.find((p) => statusFor(p) === 'Ready') ?? state.providers[0] ?? null
}
