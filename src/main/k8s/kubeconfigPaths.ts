import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getSessionScope } from '../persistence/sessionScope'

export function sanitizeKubeconfigLabel(value: string): string {
  return value.replace(/[^a-zA-Z0-9@._-]/g, '_')
}

/** Per-user scoped kubeconfig path: `{email}@{context}.kubeconfig` */
export function orgKubeconfigFilePath(userEmail: string, contextName: string): string {
  const scope = getSessionScope()
  const dir = join(app.getPath('userData'), 'kubeconfigs', scope)
  mkdirSync(dir, { recursive: true })
  const safeEmail = sanitizeKubeconfigLabel(userEmail.toLowerCase())
  const safeContext = sanitizeKubeconfigLabel(contextName)
  return join(dir, `${safeEmail}@${safeContext}.kubeconfig`)
}
