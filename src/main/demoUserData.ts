import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * Must be imported before any electron-store module.
 * MAGICLENS_DEMO=1 uses an isolated profile so real kubeconfigs never load.
 */
export function isDemoMode(): boolean {
  return process.env.MAGICLENS_DEMO === '1'
}

if (isDemoMode() || process.env.MAGICLENS_USER_DATA) {
  const dir = process.env.MAGICLENS_USER_DATA || join(tmpdir(), 'magiclens-demo-profile')
  mkdirSync(dir, { recursive: true })
  app.setPath('userData', dir)
  // Demo mode must never touch real files: Sparks keeps its vault under Documents.
  if (isDemoMode()) {
    const docs = join(dir, 'documents')
    mkdirSync(docs, { recursive: true })
    app.setPath('documents', docs)
  }
}
