import { KubeConfig } from '@kubernetes/client-node'
import type { KubeconfigSource } from '@shared/types/kubeconfig'
import { stringify } from 'yaml'

export function exportScopedKubeconfigYaml(source: KubeconfigSource, contextName: string): string {
  const kc = new KubeConfig()
  if (source.type === 'file') kc.loadFromFile(source.filePath)
  else kc.loadFromString(source.yaml)

  const ctx = kc.getContexts().find((c) => c.name === contextName)
  if (!ctx) throw new Error(`Context not found: ${contextName}`)

  const clusterObj = kc.getClusters().find((c) => c.name === ctx.cluster)
  const userObj = kc.getUsers().find((u) => u.name === ctx.user)
  if (!clusterObj) throw new Error(`Cluster not found for context: ${ctx.cluster}`)
  if (!userObj) throw new Error(`User not found for context: ${ctx.user}`)

  const scoped = {
    apiVersion: 'v1',
    kind: 'Config',
    preferences: {},
    clusters: [
      {
        name: clusterObj.name,
        cluster: {
          server: clusterObj.server,
          'certificate-authority-data': (clusterObj as unknown as { caData?: string }).caData,
          'certificate-authority': (clusterObj as unknown as { caFile?: string }).caFile,
          'insecure-skip-tls-verify': (clusterObj as unknown as { skipTLSVerify?: boolean }).skipTLSVerify
        }
      }
    ],
    users: [
      {
        name: userObj.name,
        user: {
          token: (userObj as unknown as { token?: string }).token,
          username: (userObj as unknown as { username?: string }).username,
          password: (userObj as unknown as { password?: string }).password,
          'client-certificate-data': (userObj as unknown as { certData?: string }).certData,
          'client-certificate': (userObj as unknown as { certFile?: string }).certFile,
          'client-key-data': (userObj as unknown as { keyData?: string }).keyData,
          'client-key': (userObj as unknown as { keyFile?: string }).keyFile,
          'auth-provider': (userObj as unknown as { authProvider?: unknown }).authProvider,
          exec: (userObj as unknown as { exec?: unknown }).exec
        }
      }
    ],
    contexts: [
      {
        name: ctx.name,
        context: {
          cluster: ctx.cluster,
          user: ctx.user,
          namespace: ctx.namespace
        }
      }
    ],
    'current-context': ctx.name
  } as Record<string, unknown>

  const clean = JSON.parse(JSON.stringify(scoped, (_k, v) => (v === undefined ? undefined : v))) as Record<string, unknown>
  return stringify(clean)
}

