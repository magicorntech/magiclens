import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  AiChatCompleteRequest,
  AiChatCompleteResponse,
  AiProbeProviderRequest,
  AiProbeProviderResponse,
  AiProviderSetupRequest
} from '@shared/types/aiChat'
import { completeAiChat, openProviderSetup, probeAiProvider } from '../ai/aiChatService'

export function registerAiHandlers(): void {
  ipcMain.handle(
    IPC.AI_CHAT_COMPLETE,
    async (_e, req: AiChatCompleteRequest): Promise<AiChatCompleteResponse> => {
      try {
        if (!req?.provider || !Array.isArray(req.messages)) {
          return { ok: false, error: 'Invalid AI chat request' }
        }
        return await completeAiChat(req)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.AI_PROBE_PROVIDER,
    async (_e, req: AiProbeProviderRequest): Promise<AiProbeProviderResponse> => {
      try {
        if (!req?.provider) {
          return { ok: false, status: 'Not installed', detail: 'provider required' }
        }
        return await probeAiProvider(req.provider)
      } catch (err) {
        return {
          ok: false,
          status: 'Not installed',
          detail: err instanceof Error ? err.message : String(err)
        }
      }
    }
  )

  ipcMain.handle(
    IPC.AI_OPEN_CLI_LOGIN,
    async (_e, req: AiProviderSetupRequest): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        if (!req?.provider) return { ok: false, error: 'provider required' }
        return openProviderSetup(req.provider, req.action ?? 'login')
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )
}
