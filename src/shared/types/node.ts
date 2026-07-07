export interface NodeExecStartRequest {
  sessionId: string
  clusterId: string
  nodeName: string
  cols: number
  rows: number
}

export interface NodeExecInputRequest {
  sessionId: string
  data: string
}

export interface NodeExecResizeRequest {
  sessionId: string
  cols: number
  rows: number
}

export interface NodeExecSessionRequest {
  sessionId: string
}
