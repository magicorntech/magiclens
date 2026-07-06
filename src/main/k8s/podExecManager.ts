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
    sender: WebContents
  ): Promise<void> {
    this.stop(sessionId)

    const send = (channel: string, payload: unknown): void => {
      if (!sender.isDestroyed()) sender.send(channel, payload)
    }

    const stdin = new ExecStdin()
    const stdout = new ExecStdout((chunk) => send(IPC.POD_EXEC_DATA, { sessionId, stream: 'stdout', chunk: chunk.toString('utf-8') }))
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

    const exec = new Exec(clients.kc)
    const command = ['/bin/sh', '-c', 'command -v bash >/dev/null 2>&1 && exec bash || exec sh']

    const session: ExecSession = { stdin, stdout, senderId: sender.id }
    this.sessions.set(sessionId, session)

    const onExit = (reason: string): void => {
      if (this.sessions.get(sessionId) === session) {
        this.sessions.delete(sessionId)
        send(IPC.POD_EXEC_EXIT, { sessionId, reason })
      }
    }

    try {
      const ws = await exec.exec(
        namespace,
        podName,
        containerName,
        command,
        stdout,
        stderr,
        stdin,
        true,
        (status: V1Status) => onExit(status.message ?? status.status ?? 'Exited')
      )
      session.ws = ws
      ws.on('close', () => onExit('Connection closed'))
      ws.on('error', (err: Error) => onExit(err.message))
    } catch (err) {
      onExit(err instanceof Error ? err.message : String(err))
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
    session.ws?.close()
    this.sessions.delete(sessionId)
  }

  stopAllForSender(senderId: number): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.senderId === senderId) {
        session.ws?.close()
        this.sessions.delete(sessionId)
      }
    }
  }
}

export const podExecManager = new PodExecManager()
