import { Readable, Writable } from 'node:stream'
import type { WebContents } from 'electron'
import { Exec } from '@kubernetes/client-node'
import type { V1Status } from '@kubernetes/client-node'
import { IPC } from '@shared/ipc-contract'
import type { ClusterClients } from './clusterManager'

class ExecStdin extends Readable {
  _read(): void {
    // Data is pushed externally via write(); nothing to do on pull.
  }

  write(data: string): void {
    this.push(Buffer.from(data, 'utf-8'))
  }
}

/** Implements the `ResizableStream` shape the k8s client's TerminalSizeQueue expects. */
class ExecStdout extends Writable {
  rows = 24
  columns = 80

  constructor(private readonly onData: (chunk: Buffer) => void) {
    super()
  }

  _write(chunk: Buffer, _enc: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.onData(chunk)
    callback()
  }

  setSize(cols: number, rows: number): void {
    this.columns = cols
    this.rows = rows
    this.emit('resize')
  }
}

interface ExecSession {
  stdin: ExecStdin
  stdout: ExecStdout
  senderId: number
  ws?: { close: () => void }
  /** Bumps when a shell candidate is abandoned so late close/status events are ignored. */
  attempt: number
  /** Invoked exactly once when the session ends (for cleanup, e.g. deleting a debug pod). */
  onEnd?: () => void
  ended?: boolean
}

const INTERACTIVE_SHELL =
  'command -v bash >/dev/null 2>&1 && exec bash || command -v ash >/dev/null 2>&1 && exec ash || exec sh'

/** Tried in order when no explicit command is provided (distroless / minimal images vary). */
const DEFAULT_SHELL_CANDIDATES: string[][] = [
  ['/bin/bash'],
  ['bash'],
  ['/bin/sh', '-c', INTERACTIVE_SHELL],
  ['/bin/sh'],
  ['sh', '-c', INTERACTIVE_SHELL],
  ['sh'],
  ['/busybox/sh'],
  ['/bin/busybox', 'sh'],
  ['/bin/ash'],
  ['ash']
]

function isMissingExecBinary(reason: string): boolean {
  const r = reason.toLowerCase()
  return (
    r.includes('no such file or directory') ||
    r.includes('executable file not found') ||
    r.includes('not found in $path') ||
    (r.includes('exec:') && r.includes('stat '))
  )
}

class PodExecManager {
  private sessions = new Map<string, ExecSession>()

  async start(
    sessionId: string,
    clients: ClusterClients,
    namespace: string,
    podName: string,
    containerName: string,
    cols: number,
    rows: number,
    sender: WebContents,
    command?: string[],
    onEnd?: () => void
  ): Promise<void> {
    this.stop(sessionId)

    const send = (channel: string, payload: unknown): void => {
      if (!sender.isDestroyed()) sender.send(channel, payload)
    }

    const stdin = new ExecStdin()
    const stdout = new ExecStdout((chunk) =>
      send(IPC.POD_EXEC_DATA, { sessionId, stream: 'stdout', chunk: chunk.toString('utf-8') })
    )
    stdout.setSize(cols, rows)
    const stderr = new Writable({
      write: (chunk: Buffer, _enc, callback) => {
        send(IPC.POD_EXEC_DATA, { sessionId, stream: 'stderr', chunk: chunk.toString('utf-8') })
        callback()
      }
    })
    // Without listeners, an aborted/closed connection surfacing as an 'error' on either stream
    // would otherwise be an unhandled error and crash the whole main process.
    stdout.on('error', () => {})
    stderr.on('error', () => {})
    stdin.on('error', () => {})

    const session: ExecSession = { stdin, stdout, senderId: sender.id, attempt: 0, onEnd }
    this.sessions.set(sessionId, session)

    const candidates = command ? [command] : DEFAULT_SHELL_CANDIDATES
    const exec = new Exec(clients.kc)

    const finish = (reason: string): void => {
      if (this.sessions.get(sessionId) !== session) return
      this.sessions.delete(sessionId)
      this.runOnEnd(session)
      send(IPC.POD_EXEC_EXIT, { sessionId, reason })
    }

    const runCandidate = async (index: number): Promise<void> => {
      if (this.sessions.get(sessionId) !== session) return
      session.attempt += 1
      const attempt = session.attempt
      const shellCommand = candidates[index]

      const onFailure = (reason: string): void => {
        if (this.sessions.get(sessionId) !== session || session.attempt !== attempt) return
        if (isMissingExecBinary(reason) && index + 1 < candidates.length) {
          // Invalidate this attempt before closing so late close/error handlers are ignored.
          session.attempt += 1
          try {
            session.ws?.close()
          } catch {
            /* ignore */
          }
          session.ws = undefined
          void runCandidate(index + 1)
          return
        }
        const suffix =
          !command && index + 1 >= candidates.length && isMissingExecBinary(reason)
            ? ' (no shell found in container — image may be distroless/scratch)'
            : ''
        finish(reason + suffix)
      }

      try {
        const ws = await exec.exec(
          namespace,
          podName,
          containerName,
          shellCommand,
          stdout,
          stderr,
          stdin,
          true,
          (status: V1Status) => {
            if (this.sessions.get(sessionId) !== session || session.attempt !== attempt) return
            onFailure(status.message ?? status.status ?? 'Exited')
          }
        )
        if (this.sessions.get(sessionId) !== session || session.attempt !== attempt) {
          try {
            ws.close()
          } catch {
            /* ignore */
          }
          return
        }
        session.ws = ws
        ws.on('close', () => {
          if (this.sessions.get(sessionId) !== session || session.attempt !== attempt) return
          finish('Connection closed')
        })
        ws.on('error', (err: Error) => {
          if (this.sessions.get(sessionId) !== session || session.attempt !== attempt) return
          onFailure(err.message)
        })
      } catch (err) {
        onFailure(err instanceof Error ? err.message : String(err))
      }
    }

    await runCandidate(0)
  }

  private runOnEnd(session: ExecSession): void {
    if (session.ended) return
    session.ended = true
    try {
      session.onEnd?.()
    } catch {
      /* cleanup best-effort */
    }
  }

  input(sessionId: string, data: string): void {
    this.sessions.get(sessionId)?.stdin.write(data)
  }

  resize(sessionId: string, cols: number, rows: number): void {
    this.sessions.get(sessionId)?.stdout.setSize(cols, rows)
  }

  stop(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    session.attempt += 1
    session.ws?.close()
    this.sessions.delete(sessionId)
    this.runOnEnd(session)
  }

  stopAllForSender(senderId: number): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.senderId === senderId) {
        session.attempt += 1
        session.ws?.close()
        this.sessions.delete(sessionId)
        this.runOnEnd(session)
      }
    }
  }
}

export const podExecManager = new PodExecManager()
