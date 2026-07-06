import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  TerminalInputRequest,
  TerminalResizeRequest,
  TerminalStartRequest,
  TerminalStartResponse,
  TerminalStopRequest
} from '@shared/types/terminal'
import { localTerminalManager } from '../terminal/localTerminalManager'

export function registerTerminalHandlers(): void {
  ipcMain.handle(IPC.TERMINAL_START, (event, req: TerminalStartRequest): TerminalStartResponse => {
    const sender = event.sender
    sender.once('destroyed', () => localTerminalManager.stopAllForSender(sender.id))
    return localTerminalManager.start(req.sessionId, req.cols, req.rows, sender, req.cwd)
  })

  ipcMain.handle(IPC.TERMINAL_INPUT, (_e, req: TerminalInputRequest) => {
    localTerminalManager.input(req.sessionId, req.data)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.TERMINAL_RESIZE, (_e, req: TerminalResizeRequest) => {
    localTerminalManager.resize(req.sessionId, req.cols, req.rows)
    return { ok: true as const }
  })

  ipcMain.handle(IPC.TERMINAL_STOP, (_e, req: TerminalStopRequest) => {
    localTerminalManager.stop(req.sessionId)
    return { ok: true as const }
  })
}
