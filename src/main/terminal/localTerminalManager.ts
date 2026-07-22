import os from 'node:os'
import type { WebContents } from 'electron'
import { unlinkSync } from 'node:fs'
import * as pty from 'node-pty'
import { IPC } from '@shared/ipc-contract'
import type { TerminalStartResponse } from '@shared/types/terminal'

interface Session {
  proc: pty.IPty
  senderId: number
  tempPaths?: string[]
}

function defaultShell(): string {
  if (process.platform === 'win32') {
    return process.env['COMSPEC'] || 'powershell.exe'
  }
  return process.env['SHELL'] || '/bin/zsh'
}

class LocalTerminalManager {
  private sessions = new Map<string, Session>()

  start(
    sessionId: string,
    cols: number,
    rows: number,
    sender: WebContents,
    cwd?: string,
    env?: Record<string, string>,
    tempPaths?: string[]
  ): TerminalStartResponse {
    this.stop(sessionId)

    try {
      const shell = defaultShell()
      const proc = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: cwd || os.homedir(),
        env: { ...(process.env as Record<string, string>), ...(env ?? {}) }
      })

      const send = (channel: string, payload: unknown): void => {
        if (!sender.isDestroyed()) sender.send(channel, payload)
      }

      proc.onData((chunk) => send(IPC.TERMINAL_DATA, { sessionId, chunk }))
      proc.onExit(({ exitCode }) => {
        this.sessions.delete(sessionId)
        for (const p of tempPaths ?? []) {
          try {
            unlinkSync(p)
          } catch {
            // ignore
          }
        }
        send(IPC.TERMINAL_EXIT, { sessionId, exitCode })
      })

      this.sessions.set(sessionId, { proc, senderId: sender.id, tempPaths })
      return { ok: true }
    } catch (err) {
      for (const p of tempPaths ?? []) {
        try {
          unlinkSync(p)
        } catch {
          // ignore
        }
      }
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  input(sessionId: string, data: string): void {
    this.sessions.get(sessionId)?.proc.write(data)
  }

  resize(sessionId: string, cols: number, rows: number): void {
    try {
      this.sessions.get(sessionId)?.proc.resize(cols, rows)
    } catch {
      // Ignore races where the pty already exited but the renderer hasn't caught up yet.
    }
  }

  stop(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    try {
      session.proc.kill()
    } catch {
      // Already dead.
    }
    for (const p of session.tempPaths ?? []) {
      try {
        unlinkSync(p)
      } catch {
        // ignore
      }
    }
    this.sessions.delete(sessionId)
  }

  stopAllForSender(senderId: number): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.senderId === senderId) {
        try {
          session.proc.kill()
        } catch {
          // Already dead.
        }
        this.sessions.delete(sessionId)
      }
    }
  }
}

export const localTerminalManager = new LocalTerminalManager()
