export type KubeconfigSource = { type: 'file'; filePath: string } | { type: 'raw'; yaml: string }

export interface ContextInfo {
  name: string
  clusterName: string
  userName: string
  namespace?: string
  server?: string
  /** Stable hash of user auth (token/cert/exec) for duplicate detection. */
  authFingerprint?: string
}

export interface ParsedKubeconfigResult {
  contexts: ContextInfo[]
  currentContext?: string
  source: KubeconfigSource
}

export interface PickFileResult {
  canceled: boolean
  filePath?: string
  contents?: string
}

export interface PickDirectoryResult {
  canceled: boolean
  directoryPath?: string
}

export interface ScannedKubeconfigFile {
  filePath: string
  contexts: ContextInfo[]
}

export interface ScanDirectoryResponse {
  directoryPath: string
  exists: boolean
  files: ScannedKubeconfigFile[]
}

export interface ReadKubeconfigSourceRequest {
  source: KubeconfigSource
}

export interface ReadKubeconfigSourceResponse {
  ok: true
  yaml: string
}

export interface WriteKubeconfigFileRequest {
  filePath: string
  yaml: string
}

export type WriteKubeconfigFileResponse = { ok: true } | { ok: false; error: string }

export interface ExportKubeconfigContextRequest {
  source: KubeconfigSource
  contextName: string
}

export type ExportKubeconfigContextResponse = { ok: true; yaml: string } | { ok: false; error: string }
