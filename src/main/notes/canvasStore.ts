import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { SparksCanvasDoc } from '@shared/types/sparks'
import { getVaultPath, ensureVault } from './vaultStore'

function canvasPath(): string {
  const root = ensureVault()
  const dir = join(root, '.sparks')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'canvas.json')
}

export function emptyCanvas(): SparksCanvasDoc {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    nodes: [],
    edges: []
  }
}

export function loadCanvas(): SparksCanvasDoc {
  const file = canvasPath()
  if (!existsSync(file)) return emptyCanvas()
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<SparksCanvasDoc>
    return {
      version: 1,
      updatedAt: raw.updatedAt || new Date().toISOString(),
      nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
      edges: Array.isArray(raw.edges) ? raw.edges : []
    }
  } catch {
    return emptyCanvas()
  }
}

export function saveCanvas(doc: SparksCanvasDoc): SparksCanvasDoc {
  const next: SparksCanvasDoc = {
    version: 1,
    updatedAt: new Date().toISOString(),
    nodes: doc.nodes ?? [],
    edges: doc.edges ?? []
  }
  writeFileSync(canvasPath(), JSON.stringify(next, null, 2), 'utf8')
  return next
}

export function vaultDotSparksDir(): string {
  return join(getVaultPath(), '.sparks')
}
