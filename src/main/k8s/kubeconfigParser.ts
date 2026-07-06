import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { KubeConfig } from '@kubernetes/client-node'
import type { KubeconfigSource, ParsedKubeconfigResult, ScannedKubeconfigFile } from '@shared/types/kubeconfig'

function toParsedResult(kc: KubeConfig, source: KubeconfigSource): ParsedKubeconfigResult {
  const clusters = new Map(kc.getClusters().map((c) => [c.name, c]))
  const contexts = kc.getContexts().map((ctx) => ({
    name: ctx.name,
    clusterName: ctx.cluster,
    userName: ctx.user,
    namespace: ctx.namespace,
    server: clusters.get(ctx.cluster)?.server
  }))

  return {
    contexts,
    currentContext: kc.getCurrentContext(),
    source
  }
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
