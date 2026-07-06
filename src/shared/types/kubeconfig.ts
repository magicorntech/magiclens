export type KubeconfigSource = { type: 'file'; filePath: string } | { type: 'raw'; yaml: string }

export interface ContextInfo {
  name: string
  clusterName: string
  userName: string
  namespace?: string
  server?: string
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
