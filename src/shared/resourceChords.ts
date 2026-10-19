import { RESOURCE_KINDS, type ResourceKind } from './resourceKinds'

/** A 2- or 3-key sequence that opens a Kubernetes resource kind as a tab. */
export interface ResourceChord {
  id: string
  kind: ResourceKind
  keys: string[]
}

export const RESOURCE_CHORD_TEMPLATE: Array<Pick<ResourceChord, 'kind' | 'keys'>> = [
  { kind: 'Pods', keys: ['p', 'o'] },
  { kind: 'Deployments', keys: ['d', 'e'] },
  { kind: 'Services', keys: ['s', 'v'] },
  { kind: 'Nodes', keys: ['n', 'o'] },
  { kind: 'Ingresses', keys: ['i', 'n'] },
  { kind: 'Jobs', keys: ['j', 'o'] },
  { kind: 'Events', keys: ['e', 'v'] },
  { kind: 'Namespaces', keys: ['n', 's'] },
  { kind: 'ConfigMaps', keys: ['c', 'm'] },
  { kind: 'Secrets', keys: ['s', 'e'] },
  { kind: 'StatefulSets', keys: ['s', 't', 's'] },
  { kind: 'DaemonSets', keys: ['d', 's'] },
  { kind: 'PersistentVolumeClaims', keys: ['p', 'v', 'c'] },
  { kind: 'NetworkPolicies', keys: ['n', 'p'] },
  { kind: 'HorizontalPodAutoscalers', keys: ['h', 'p', 'a'] },
  { kind: 'CustomResourceDefinitions', keys: ['c', 'r', 'd'] }
]

export function isResourceKind(value: string): value is ResourceKind {
  return (RESOURCE_KINDS as readonly string[]).includes(value)
}

export function normalizeChordKeys(keys: string[]): string[] {
  return keys
    .map((key) => key.trim().toLowerCase())
    .filter((key) => /^[a-z0-9]$/.test(key))
    .slice(0, 3)
}

export function chordKeysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index])
}

export function chordIsPrefix(longer: string[], shorter: string[]): boolean {
  return longer.length > shorter.length && shorter.every((key, index) => longer[index] === key)
}

export function normalizeResourceChords(raw: unknown): ResourceChord[] {
  if (!Array.isArray(raw)) return []
  const out: ResourceChord[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Partial<ResourceChord>
    if (typeof row.id !== 'string' || typeof row.kind !== 'string' || !isResourceKind(row.kind)) continue
    const keys = normalizeChordKeys(Array.isArray(row.keys) ? row.keys : [])
    if (keys.length < 2) continue
    out.push({ id: row.id, kind: row.kind, keys })
  }
  return out
}

export type ChordResolution =
  | { type: 'fire'; chord: ResourceChord }
  | { type: 'wait'; chord: ResourceChord }
  | { type: 'prefix' }
  | { type: 'none' }

/** Exact match fires immediately unless a longer chord still starts with this sequence. */
export function resolveChord(chords: ResourceChord[], sequence: string[]): ChordResolution {
  if (sequence.length === 0) return { type: 'none' }
  const exact = chords.find((chord) => chordKeysEqual(chord.keys, sequence))
  if (exact) return { type: 'fire', chord: exact }
  const longer = chords.some((chord) => chordIsPrefix(chord.keys, sequence))
  if (longer) return { type: 'prefix' }
  return { type: 'none' }
}

export function buildChordTemplate(existing: ResourceChord[]): ResourceChord[] {
  const usedKinds = new Set(existing.map((chord) => chord.kind))
  const used = existing.map((chord) => chord.keys)
  const next = [...existing]
  for (const item of RESOURCE_CHORD_TEMPLATE) {
    if (usedKinds.has(item.kind)) continue
    const clashes = used.some(
      (keys) => chordKeysEqual(keys, item.keys) || chordIsPrefix(keys, item.keys) || chordIsPrefix(item.keys, keys)
    )
    if (clashes) continue
    usedKinds.add(item.kind)
    used.push(item.keys)
    next.push({
      id: `chord-${item.kind.toLowerCase()}`,
      kind: item.kind,
      keys: [...item.keys]
    })
  }
  return next
}
