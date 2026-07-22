export interface TerminalStartRequest {
  sessionId: string
  cols: number
  rows: number
  cwd?: string
  clusterId?: string
  env?: Record<string, string>
}

export type TerminalStartResponse = { ok: true } | { ok: false; error: string }

export interface TerminalInputRequest {
  sessionId: string
  data: string
}

export interface TerminalResizeRequest {
  sessionId: string
  cols: number
  rows: number
}

export interface TerminalStopRequest {
  sessionId: string
}

export interface TerminalDataPayload {
  sessionId: string
  chunk: string
}

export interface TerminalExitPayload {
  sessionId: string
  exitCode: number
}
