import type { AiProviderConfig } from './aiAgent'

/** Orb / voice session surface states (APEX-inspired). */
export type MollyOrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

/** Visual constellation roles — single runtime in v1. */
export type MollyAgentRole = 'watcher' | 'navigator' | 'explainer'

export type MollyStartupCheckId = 'cpu' | 'memory' | 'events' | 'failedPods'

export interface MollyStartupPlan {
  enabled: boolean
  /** Empty = all connected clusters. */
  clusterIds: string[]
  checks: MollyStartupCheckId[]
  /** Speak a short summary when issues are found. */
  speakOnIssues: boolean
}

export interface MollySettings {
  startup: MollyStartupPlan
  /** BCP-47 voice / recognition locale, e.g. en-US, tr-TR. */
  voiceLocale: string
  /** Prefer Gemini when available; otherwise fall back to Copilot default provider. */
  preferGemini: boolean
  micEnabled: boolean
  /**
   * Voice conversation: Molly speaks replies and keeps listening after each turn.
   * Default on — this is the main “chat with Molly” mode.
   */
  voiceChat: boolean
  /**
   * Use Gemini Live (bidirectional audio) when Gemini API key is available.
   * Falls back to record→STT→TTS if Live fails.
   */
  geminiLive: boolean
  /**
   * Gemini Live model id, or `auto` to try the preferred Live chain.
   * @see MOLLY_LIVE_MODEL_AUTO / MOLLY_LIVE_MODEL_OPTIONS in shared/mollyModels.ts
   */
  liveModel: string
  /**
   * Continuously listen for the wake word “Molly” and open a Live session.
   */
  wakeWord: boolean
  /**
   * When true, Molly also reads typed (non-voice) replies aloud.
   * Voice turns always speak when voiceChat is on.
   */
  speakReplies: boolean
  /**
   * Keep a floating always-on-top Molly HUD (Electron port of the Python overlay).
   * Voice works from the HUD while you stay on other MagicLens tabs / apps.
   */
  backgroundHud: boolean
}

export const DEFAULT_MOLLY_SETTINGS: MollySettings = {
  startup: {
    /** Off — Molly should not auto-scan or post findings into chat. */
    enabled: false,
    clusterIds: [],
    checks: ['cpu', 'memory', 'events', 'failedPods'],
    speakOnIssues: false
  },
  voiceLocale: 'tr-TR',
  preferGemini: true,
  micEnabled: true,
  voiceChat: true,
  geminiLive: true,
  liveModel: 'auto',
  wakeWord: false,
  /** Off by default — Gemini Live speaks; OS TTS doubles the voice. */
  speakReplies: false,
  backgroundHud: false
}

export type MollyToolName =
  | 'listClusters'
  | 'getClusterHealth'
  | 'getNodeMetrics'
  | 'getPodMetrics'
  | 'getEvents'
  | 'getPodLogs'
  | 'listResources'
  | 'inspectResource'
  | 'getUsage'
  | 'getSecurity'
  | 'startSecurityScan'
  | 'navigateTo'
  | 'summarizeAnomalies'
  | 'proposeWorkloadAction'

export interface MollyToolCall {
  name: MollyToolName
  args: Record<string, unknown>
}

export interface MollyRunToolRequest {
  call: MollyToolCall
}

export interface MollyRunToolResponse {
  ok: boolean
  result?: MollyToolResult
  error?: string
}

export interface MollyNavigateTarget {
  /** Cluster UUID — required for in-cluster pages; omit when opening Molly hub / app views. */
  clusterId?: string
  namespace?: string
  kind?: string
  name?: string
  virtualPage?: string
  /**
   * MagicLens app shell view (not a K8s resource page).
   * Use `molly` to return to the Molly hub from a cluster tab.
   */
  appView?: string
}

export interface MollyToolResult {
  name: MollyToolName
  ok: boolean
  summary: string
  data?: unknown
  navigate?: MollyNavigateTarget
}

export interface MollyTurnRequest {
  text: string
  /** Provider snapshot from renderer (keys stay in renderer store for v1 parity with Copilot). */
  provider: AiProviderConfig
  cliWorkdir?: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  /** Hint for tool default cluster. */
  activeClusterId?: string | null
  /** Live UI context (cluster, namespace, kind). Not shown in the transcript. */
  contextHint?: string
}

export interface MollyTurnResponse {
  ok: boolean
  reply?: string
  error?: string
  toolResults: MollyToolResult[]
  navigate?: MollyNavigateTarget
}

export interface MollyStartupCheckRequest {
  provider: AiProviderConfig
  cliWorkdir?: string
  plan: MollyStartupPlan
  /** Connected cluster ids available right now. */
  connectedClusterIds: string[]
}

export interface MollyStartupFinding {
  clusterId: string
  clusterName: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}

export interface MollyStartupCheckResponse {
  ok: boolean
  error?: string
  findings: MollyStartupFinding[]
  spokenSummary?: string
}

export interface MollyTranscribeRequest {
  provider: AiProviderConfig
  mimeType: string
  /** Base64 audio payload (no data: URL prefix). */
  base64: string
  locale?: string
}

export interface MollyTranscribeResponse {
  ok: boolean
  text?: string
  error?: string
  model?: string
}

export interface MollyExportChatRequest {
  /** Suggested file name without forcing extension when format is set. */
  defaultFileName: string
  /** File body to write. */
  content: string
  format: 'md' | 'json'
}

export interface MollyExportChatResponse {
  ok: boolean
  canceled?: boolean
  filePath?: string
  error?: string
}
