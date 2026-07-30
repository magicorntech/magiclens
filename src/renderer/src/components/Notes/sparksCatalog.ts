import type { SparksTemplate, SparksThemeId, SparksPluginManifest } from '@shared/types/sparks'
import { SPARKS_THEME_IDS } from '@shared/types/sparks'

export type SparksThemeTone = 'system' | 'light' | 'dark'

export const SPARKS_THEMES: Array<{
  id: SparksThemeId
  label: string
  description: string
  tone: SparksThemeTone
  swatch: [string, string, string]
}> = [
  {
    id: 'default',
    label: 'System',
    description: 'Follows MagicLens layout colors',
    tone: 'system',
    swatch: ['#f4f6f8', '#ffffff', '#64748b']
  },
  {
    id: 'paper',
    label: 'Paper',
    description: 'Warm off-white writing desk',
    tone: 'light',
    swatch: ['#f7f4ef', '#fffcf7', '#8b7355']
  },
  {
    id: 'parchment',
    label: 'Parchment',
    description: 'Soft aged-page cream',
    tone: 'light',
    swatch: ['#efe6d5', '#f8f1e3', '#9a6b3f']
  },
  {
    id: 'mono',
    label: 'Mono',
    description: 'Clean slate and charcoal',
    tone: 'light',
    swatch: ['#eef1f4', '#ffffff', '#334155']
  },
  {
    id: 'matcha',
    label: 'Matcha',
    description: 'Quiet green tea light',
    tone: 'light',
    swatch: ['#eef5eb', '#f7fbf5', '#4d7c57']
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Coastal teal and seafoam',
    tone: 'light',
    swatch: ['#e8f2f4', '#f5fbfc', '#0f766e']
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Moss and deep woodland',
    tone: 'light',
    swatch: ['#e9efe8', '#f4f8f3', '#3f6b4a']
  },
  {
    id: 'rose',
    label: 'Rose',
    description: 'Dusty rose with clay accents',
    tone: 'light',
    swatch: ['#f6ecef', '#fdf7f8', '#a85d6c']
  },
  {
    id: 'ink',
    label: 'Ink',
    description: 'Midnight ink with cool blue',
    tone: 'dark',
    swatch: ['#12141a', '#1a1d26', '#8b9cff']
  },
  {
    id: 'dusk',
    label: 'Dusk',
    description: 'Twilight blue-grey night',
    tone: 'dark',
    swatch: ['#141820', '#1b222d', '#7eb6c9']
  },
  {
    id: 'nord',
    label: 'Nord',
    description: 'Arctic frost and polar night',
    tone: 'dark',
    swatch: ['#2e3440', '#3b4252', '#88c0d0']
  },
  {
    id: 'solar',
    label: 'Solar',
    description: 'Warm amber on deep umber',
    tone: 'dark',
    swatch: ['#1c1812', '#262018', '#d4a017']
  },
  {
    id: 'ember',
    label: 'Ember',
    description: 'Charcoal with coral glow',
    tone: 'dark',
    swatch: ['#161314', '#221c1d', '#e07a5f']
  }
]

const THEME_ID_SET = new Set<string>(SPARKS_THEME_IDS)

export const SPARKS_TEMPLATES: SparksTemplate[] = [
  {
    id: 'daily-journal',
    name: 'Daily journal',
    description: 'Quick end-of-day capture',
    folder: 'Journal',
    title: '{{date}}',
    tags: ['journal', 'daily'],
    body: [
      '## Today',
      '',
      '- ',
      '',
      '## Blockers',
      '',
      '- ',
      '',
      '## Tomorrow',
      '',
      '- ',
      '',
      '## Links',
      '',
      '- [[Getting Started]]'
    ].join('\n')
  },
  {
    id: 'incident',
    name: 'Incident note',
    description: 'Cluster / outage scratchpad',
    folder: 'Clusters',
    title: 'Incident {{date}}',
    tags: ['incident', 'ops'],
    body: [
      '## Summary',
      '',
      '',
      '',
      '## Impact',
      '',
      '- Cluster:',
      '- Namespace:',
      '- Symptoms:',
      '',
      '## Timeline',
      '',
      '- {{time}} — noticed',
      '',
      '## Commands / checks',
      '',
      '```bash',
      'kubectl get pods -A | head',
      '```',
      '',
      '## Follow-ups',
      '',
      '- [ ] '
    ].join('\n')
  },
  {
    id: 'knowledge-base',
    name: 'Concept',
    description: 'Evergreen knowledge note',
    folder: 'Inbox',
    title: 'Untitled concept',
    tags: ['kb'],
    body: [
      '> One-sentence definition.',
      '',
      '## Why it matters',
      '',
      '',
      '',
      '## How we use it',
      '',
      '',
      '',
      '## Related',
      '',
      '- [[Getting Started]]',
      '',
      '## Sources',
      '',
      '- '
    ].join('\n')
  },
  {
    id: 'project',
    name: 'Project',
    description: 'Lightweight project tracker',
    folder: 'Inbox',
    title: 'Untitled project',
    tags: ['project'],
    body: [
      '**Status:** planning  ',
      '**Owner:** ',
      '',
      '## Goal',
      '',
      '',
      '',
      '## Next actions',
      '',
      '- [ ] ',
      '- [ ] ',
      '',
      '## Notes',
      '',
      '',
      '',
      '## Links',
      '',
      '- '
    ].join('\n')
  }
]

export const BUILTIN_PLUGINS: SparksPluginManifest[] = [
  {
    id: 'templates',
    name: 'Templates',
    description: 'Journal, incident, concept, and project starters',
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'graph',
    name: 'Graph view',
    description: 'Map of [[wiki links]] between notes',
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'canvas',
    name: 'Canvas',
    description: 'Spatial board for arranging notes',
    version: '1.0.0',
    enabled: true
  },
  {
    id: 'wikilinks',
    name: 'Wiki links',
    description: '[[Note]] linking with backlinks panel',
    version: '1.0.0',
    enabled: true
  }
]

export const DEFAULT_PLUGINS_ENABLED: Record<string, boolean> = Object.fromEntries(
  BUILTIN_PLUGINS.map((p) => [p.id, p.enabled])
)

export function applyTemplatePlaceholders(input: string, now = new Date()): string {
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 5)
  return input.replaceAll('{{date}}', date).replaceAll('{{time}}', time)
}

export function normalizeSparksThemeId(raw: unknown): SparksThemeId {
  if (raw === 'sepia') return 'parchment'
  if (raw === 'midnight') return 'ink'
  if (raw === 'focus') return 'mono'
  if (typeof raw === 'string' && THEME_ID_SET.has(raw)) return raw as SparksThemeId
  return 'default'
}

export function sparksThemeTone(themeId: SparksThemeId): SparksThemeTone {
  return SPARKS_THEMES.find((t) => t.id === themeId)?.tone ?? 'system'
}
