import { protocol, net } from 'electron'
import { existsSync } from 'fs'
import { join, normalize, resolve, sep } from 'path'
import { pathToFileURL } from 'url'
import { getVaultPath } from './vaultStore'

/** Must run before app.ready. */
export function registerSparksMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'sparks-media',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: true,
        corsEnabled: true
      }
    }
  ])
}

function isInsideVault(abs: string, root: string): boolean {
  const resolved = resolve(abs)
  const base = resolve(root)
  return resolved === base || resolved.startsWith(base + sep)
}

/** Register after app.ready — serves vault files to the renderer. */
export function installSparksMediaProtocol(): void {
  protocol.handle('sparks-media', (request) => {
    try {
      const url = new URL(request.url)
      // sparks-media://local/Attachments/...  → pathname /Attachments/...
      const rel = decodeURIComponent((url.pathname || '').replace(/^\/+/, ''))
      if (!rel || rel.includes('..')) {
        return new Response('Bad path', { status: 400 })
      }
      const root = getVaultPath()
      const abs = normalize(join(root, ...rel.split('/')))
      if (!isInsideVault(abs, root) || !existsSync(abs)) {
        return new Response('Not found', { status: 404 })
      }
      return net.fetch(pathToFileURL(abs).href)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return new Response(message, { status: 500 })
    }
  })
}

export function sparksMediaUrl(relativePath: string): string {
  const rel = relativePath.replace(/^\/+/, '').split(/[/\\]/).map(encodeURIComponent).join('/')
  return `sparks-media://local/${rel}`
}
