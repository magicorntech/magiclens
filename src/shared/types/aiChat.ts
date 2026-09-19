import type { AiProviderConfig, AiProviderId } from './aiAgent'
import type { AiRunbookAction } from '../aiProviderRunbook'

export interface AiChatTurn {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiChatCompleteRequest {
  provider: AiProviderConfig
  messages: AiChatTurn[]
  /** Optional working directory for CLI providers */
  cliWorkdir?: string
}

export interface AiChatCompleteSuccess {
  ok: true
  content: string
  providerId: AiProviderId
  model: string
}

export interface AiChatCompleteFailure {
  ok: false
  error: string
  providerId?: AiProviderId
}

export type AiChatCompleteResponse = AiChatCompleteSuccess | AiChatCompleteFailure

export interface AiProbeProviderRequest {
  provider: AiProviderConfig
}

export interface AiProbeProviderResponse {
  ok: boolean
  status: 'Ready' | 'Needs key' | 'Not installed'
  detail?: string
  models?: string[]
  /** Absolute path when a CLI binary was resolved */
  resolvedPath?: string
}

export interface AiProviderSetupRequest {
  provider: AiProviderConfig
  action?: AiRunbookAction
}
