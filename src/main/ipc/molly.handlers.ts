import { BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import { IPC } from '@shared/ipc-contract'
import type {
  MollyTurnRequest,
  MollyTurnResponse,
  MollyStartupCheckRequest,
  MollyStartupCheckResponse,
  MollyNavigateTarget,
  MollyTranscribeRequest,
  MollyTranscribeResponse,
  MollyRunToolRequest,
  MollyRunToolResponse,
  MollyToolName,
  MollyExportChatRequest,
  MollyExportChatResponse
} from '@shared/types/molly'
import { runMollyTurn, runMollyStartup } from '../ai/mollyAgentService'
import { transcribeGeminiAudio } from '../ai/geminiClient'
import { runMollyTool, MOLLY_TOOL_NAMES } from '../ai/mollyToolRunner'
import { ensureMicrophoneAccess } from '../mediaPermissions'
import {
  closeMollyHud,
  focusMainFromMollyHud,
  isMollyHudOpen,
  openMollyHud,
  toggleMollyHud
} from '../mollyHudWindow'

function broadcastNavigate(target: MollyNavigateTarget): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    try {
      win.webContents.send(IPC.MOLLY_NAVIGATE, target)
    } catch {
      /* ignore */
    }
  }
}

export function registerMollyHandlers(): void {
  ipcMain.handle(IPC.MOLLY_ENSURE_MIC, () => ensureMicrophoneAccess(true))
  ipcMain.handle(IPC.MOLLY_TURN, async (_e, req: MollyTurnRequest): Promise<MollyTurnResponse> => {
    try {
      if (!req?.text?.trim() || !req.provider) {
        return { ok: false, error: 'Invalid Molly turn request', toolResults: [] }
      }
      const result = await runMollyTurn(req)
      if (result.navigate) broadcastNavigate(result.navigate)
      return result
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        toolResults: []
      }
    }
  })

  ipcMain.handle(
    IPC.MOLLY_STARTUP_CHECK,
    async (_e, req: MollyStartupCheckRequest): Promise<MollyStartupCheckResponse> => {
      try {
        if (!req?.plan) {
          return { ok: false, error: 'plan required', findings: [] }
        }
        return await runMollyStartup(req)
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          findings: []
        }
      }
    }
  )

  ipcMain.handle(
    IPC.MOLLY_TRANSCRIBE,
    async (_e, req: MollyTranscribeRequest): Promise<MollyTranscribeResponse> => {
      try {
        if (!req?.provider?.credential?.trim() || !req.base64) {
          return { ok: false, error: 'provider + audio required' }
        }
        const result = await transcribeGeminiAudio({
          apiKey: req.provider.credential,
          model: req.provider.model,
          mimeType: req.mimeType || 'audio/webm',
          base64: req.base64,
          locale: req.locale
        })
        if (!result.ok) return { ok: false, error: result.error }
        return { ok: true, text: result.text, model: result.model }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(
    IPC.MOLLY_RUN_TOOL,
    async (_e, req: MollyRunToolRequest): Promise<MollyRunToolResponse> => {
      try {
        const name = req?.call?.name
        if (!name || !(MOLLY_TOOL_NAMES as string[]).includes(name)) {
          return { ok: false, error: 'unknown tool' }
        }
        const result = await runMollyTool({
          name: name as MollyToolName,
          args: req.call.args ?? {}
        })
        if (result.navigate) broadcastNavigate(result.navigate)
        return { ok: true, result }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(IPC.MOLLY_HUD_OPEN, () => openMollyHud())
  ipcMain.handle(IPC.MOLLY_HUD_CLOSE, () => closeMollyHud())
  ipcMain.handle(IPC.MOLLY_HUD_TOGGLE, () => toggleMollyHud())
  ipcMain.handle(IPC.MOLLY_HUD_IS_OPEN, () => ({ open: isMollyHudOpen() }))
  ipcMain.handle(IPC.MOLLY_HUD_FOCUS_MAIN, () => {
    focusMainFromMollyHud()
    return { ok: true as const }
  })

  ipcMain.handle(
    IPC.MOLLY_EXPORT_CHAT,
    async (event, req: MollyExportChatRequest): Promise<MollyExportChatResponse> => {
      try {
        if (!req?.content || !req.defaultFileName) {
          return { ok: false, error: 'content and defaultFileName required' }
        }
        const ext = req.format === 'json' ? 'json' : 'md'
        const base = req.defaultFileName.replace(/\.(md|json)$/i, '')
        const defaultPath = `${base}.${ext}`
        const win = BrowserWindow.fromWebContents(event.sender)
        const result = win
          ? await dialog.showSaveDialog(win, {
              defaultPath,
              filters:
                ext === 'json'
                  ? [
                      { name: 'JSON', extensions: ['json'] },
                      { name: 'All files', extensions: ['*'] }
                    ]
                  : [
                      { name: 'Markdown', extensions: ['md'] },
                      { name: 'All files', extensions: ['*'] }
                    ]
            })
          : await dialog.showSaveDialog({
              defaultPath,
              filters:
                ext === 'json'
                  ? [
                      { name: 'JSON', extensions: ['json'] },
                      { name: 'All files', extensions: ['*'] }
                    ]
                  : [
                      { name: 'Markdown', extensions: ['md'] },
                      { name: 'All files', extensions: ['*'] }
                    ]
            })
        if (result.canceled || !result.filePath) {
          return { ok: false, canceled: true }
        }
        await writeFile(result.filePath, req.content, 'utf-8')
        return { ok: true, filePath: result.filePath }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )
}
