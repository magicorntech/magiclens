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

      const session: Session = { proc, senderId: sender.id, tempPaths }

      proc.onData((chunk) => send(IPC.TERMINAL_DATA, { sessionId, chunk }))
      proc.onExit(({ exitCode }) => {
        // A previous pty for this same session id can exit *after* its replacement was
        // registered (React re-runs effects, restarts, …). Only tear down when this pty
        // is still the live one, otherwise we would drop the replacement's session and
        // silently swallow all of its input.
        // Temp paths are derived from the session id, so the replacement shares them —
        // leave cleanup to whichever pty is actually live.
        if (this.sessions.get(sessionId) !== session) return
        this.sessions.delete(sessionId)
        this.cleanupTempPaths(tempPaths)
        send(IPC.TERMINAL_EXIT, { sessionId, exitCode })
      })

      this.sessions.set(sessionId, session)
      return { ok: true }
    } catch (err) {
      this.cleanupTempPaths(tempPaths)
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  private cleanupTempPaths(tempPaths: string[] | undefined): void {
    for (const p of tempPaths ?? []) {
      try {
        unlinkSync(p)
      } catch {
        // ignore
      }
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
    this.sessions.delete(sessionId)
    try {
      session.proc.kill()
    } catch {
      // Already dead.
    }
    this.cleanupTempPaths(session.tempPaths)
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
