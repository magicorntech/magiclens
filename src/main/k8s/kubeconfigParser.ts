import { createHash } from 'node:crypto'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { KubeConfig } from '@kubernetes/client-node'
import type {
  ContextInfo,
  KubeconfigSource,
  ParsedKubeconfigResult,
  ScannedKubeconfigFile
} from '@shared/types/kubeconfig'

function sha16(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

/** Fingerprint of the kubeconfig user credentials for a context (never stores the raw secret). */
export function authFingerprintForUser(user: ReturnType<KubeConfig['getUser']>): string | undefined {
  if (!user) return undefined
  const parts: string[] = []
  if (user.token) parts.push(`token:${sha16(user.token)}`)
  if (user.certData) parts.push(`cert:${sha16(user.certData)}`)
  if (user.keyData) parts.push(`key:${sha16(user.keyData)}`)
  if (user.exec?.command) {
    parts.push(`exec:${user.exec.command}:${(user.exec.args ?? []).join('\0')}`)
  }
  if (user.authProvider?.name) {
    parts.push(`provider:${user.authProvider.name}:${JSON.stringify(user.authProvider.config ?? {})}`)
  }
  if (user.username) parts.push(`basic:${user.username}:${sha16(user.password ?? '')}`)
  if (parts.length === 0) return undefined
  return sha16(parts.join('|'))
}

export function authFingerprintForContext(kc: KubeConfig, contextName: string): string | undefined {
  const ctx = kc.getContextObject(contextName)
  if (!ctx) return undefined
  return authFingerprintForUser(kc.getUser(ctx.user))
}

function toParsedResult(kc: KubeConfig, source: KubeconfigSource): ParsedKubeconfigResult {
  const clusters = new Map(kc.getClusters().map((c) => [c.name, c]))
  const contexts: ContextInfo[] = kc.getContexts().map((ctx) => ({
    name: ctx.name,
    clusterName: ctx.cluster,
    userName: ctx.user,
    namespace: ctx.namespace,
    server: clusters.get(ctx.cluster)?.server,
    authFingerprint: authFingerprintForUser(kc.getUser(ctx.user))
  }))

  return {
    contexts,
    currentContext: kc.getCurrentContext(),
    source
  }
}

/** Scan a directory, or parse a single kubeconfig file path. */
export function scanKubeconfigPath(targetPath: string): ScannedKubeconfigFile[] {
  try {
    const st = statSync(targetPath)
    if (st.isFile()) {
      const parsed = parseKubeconfigFile(targetPath)
      return parsed.contexts.length > 0 ? [{ filePath: targetPath, contexts: parsed.contexts }] : []
    }
  } catch {
    return []
  }
  return scanDirectoryForKubeconfigs(targetPath)
}

export function parseKubeconfigFile(filePath: string): ParsedKubeconfigResult {
  const kc = new KubeConfig()
  kc.loadFromFile(filePath)
  return toParsedResult(kc, { type: 'file', filePath })
}

export function parseKubeconfigString(yaml: string): ParsedKubeconfigResult {
  const kc = new KubeConfig()
  kc.loadFromString(yaml)
  return toParsedResult(kc, { type: 'raw', yaml })
}

export function scanDirectoryForKubeconfigs(directoryPath: string): ScannedKubeconfigFile[] {
  const entries = readdirSync(directoryPath, { withFileTypes: true })
  const results: ScannedKubeconfigFile[] = []

  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue
    const filePath = join(directoryPath, entry.name)
    try {
      const parsed = parseKubeconfigFile(filePath)
      if (parsed.contexts.length > 0) {
        results.push({ filePath, contexts: parsed.contexts })
      }
    } catch {
      // not a valid kubeconfig file, skip silently
    }
  }

  return results
}

export function buildKubeConfig(source: KubeconfigSource, contextName: string): KubeConfig {
  const kc = new KubeConfig()
  if (source.type === 'file') {
    kc.loadFromFile(source.filePath)
  } else {
    kc.loadFromString(source.yaml)
  }
  kc.setCurrentContext(contextName)
  return kc
}
