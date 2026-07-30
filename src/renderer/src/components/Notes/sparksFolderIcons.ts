import type { VaultFolderNode } from '@shared/types/notes'
import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  BookOpen,
  Boxes,
  Briefcase,
  Folder,
  Heart,
  Inbox,
  Lightbulb,
  Network,
  NotebookPen,
  Pin,
  Rocket,
  Sparkles,
  Star,
  Tag,
  Wrench
} from 'lucide-react'

export interface SparksFolderIconOption {
  id: string
  icon: LucideIcon
}

/** Curated icon ids stored in vault `.sparks-folders.json`. */
export const SPARKS_FOLDER_ICONS: SparksFolderIconOption[] = [
  { id: 'folder', icon: Folder },
  { id: 'inbox', icon: Inbox },
  { id: 'book', icon: BookOpen },
  { id: 'notebook', icon: NotebookPen },
  { id: 'briefcase', icon: Briefcase },
  { id: 'boxes', icon: Boxes },
  { id: 'network', icon: Network },
  { id: 'sparkles', icon: Sparkles },
  { id: 'star', icon: Star },
  { id: 'heart', icon: Heart },
  { id: 'lightbulb', icon: Lightbulb },
  { id: 'rocket', icon: Rocket },
  { id: 'archive', icon: Archive },
  { id: 'pin', icon: Pin },
  { id: 'tag', icon: Tag },
  { id: 'wrench', icon: Wrench }
]

const byId = new Map(SPARKS_FOLDER_ICONS.map((x) => [x.id, x.icon]))

const DEFAULT_BY_NAME: Record<string, string> = {
  Inbox: 'inbox',
  Journal: 'book',
  Clusters: 'network',
  Resources: 'boxes'
}

export function resolveFolderIconId(name: string, icon?: string | null): string {
  if (icon && byId.has(icon)) return icon
  return DEFAULT_BY_NAME[name] ?? 'folder'
}

export function folderIconComponent(name: string, icon?: string | null): LucideIcon {
  const id = resolveFolderIconId(name, icon)
  return byId.get(id) ?? Folder
}

export function flattenFolderPaths(
  nodes: VaultFolderNode[],
  prefix = ''
): { path: string; label: string }[] {
  const out: { path: string; label: string }[] = []
  for (const node of nodes) {
    const label = prefix ? `${prefix} / ${node.name}` : node.name
    out.push({ path: node.path, label })
    if (node.children.length > 0) {
      out.push(...flattenFolderPaths(node.children, label))
    }
  }
  return out
}

export function folderPathExists(nodes: VaultFolderNode[], path: string): boolean {
  for (const node of nodes) {
    if (node.path === path) return true
    if (folderPathExists(node.children, path)) return true
  }
  return false
}

export function sparksFolderImageSrc(relativePath: string): string {
  const rel = relativePath.replace(/^\/+/, '').split(/[/\\]/).map(encodeURIComponent).join('/')
  return `sparks-media://local/${rel}`
}

/** Merge API folders + note folders + optional extra paths into a display tree. */
export function mergeFolderTree(
  apiFolders: VaultFolderNode[],
  notes: { folder: string }[],
  extra: Array<{ path: string; image?: string; icon?: string }> = []
): VaultFolderNode[] {
  const root: VaultFolderNode = { name: '', path: '', children: [], noteCount: 0 }
  const map = new Map<string, VaultFolderNode>([['', root]])

  function ensure(path: string, opts?: { icon?: string; image?: string }): VaultFolderNode {
    const key = path.replace(/^\/+|\/+$/g, '')
    const existing = map.get(key)
    if (existing) {
      if (opts?.image) existing.image = opts.image
      if (opts?.icon && !existing.icon) existing.icon = opts.icon
      return existing
    }
    const name = key.includes('/') ? key.slice(key.lastIndexOf('/') + 1) : key
    const parentPath = key.includes('/') ? key.slice(0, key.lastIndexOf('/')) : ''
    const parent = ensure(parentPath)
    const node: VaultFolderNode = {
      name,
      path: key,
      children: [],
      noteCount: 0,
      ...(opts?.icon ? { icon: opts.icon } : {}),
      ...(opts?.image ? { image: opts.image } : {})
    }
    parent.children.push(node)
    map.set(key, node)
    return node
  }

  function ingest(nodes: VaultFolderNode[]): void {
    for (const node of nodes) {
      ensure(node.path, { icon: node.icon, image: node.image })
      if (node.children.length) ingest(node.children)
    }
  }

  ingest(apiFolders)
  for (const note of notes) {
    if (note.folder) ensure(note.folder)
  }
  for (const item of extra) {
    if (item.path) ensure(item.path, { icon: item.icon, image: item.image })
  }

  for (const note of notes) {
    let cursor = note.folder || ''
    while (true) {
      const node = map.get(cursor)
      if (node) node.noteCount += 1
      if (!cursor) break
      cursor = cursor.includes('/') ? cursor.slice(0, cursor.lastIndexOf('/')) : ''
    }
  }

  function sortTree(nodes: VaultFolderNode[]): VaultFolderNode[] {
    return nodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((n) => ({ ...n, children: sortTree(n.children) }))
  }

  return sortTree(root.children)
}
