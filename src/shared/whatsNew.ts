/**
 * Release highlights shown once, after the app has been updated.
 *
 * Curated in the repo rather than pulled from the GitHub release body: the notes render at
 * startup, before any network call is guaranteed to have succeeded, and release bodies are
 * auto-generated commit lists that read as changelog noise rather than something worth
 * interrupting someone for. Add an entry when a release has something a user would actually
 * notice; releases with no entry simply show nothing.
 */
export interface WhatsNewEntry {
  /** Short headline for the release. */
  title: string
  /** One line per change, written from the user's point of view. */
  items: string[]
}

export const WHATS_NEW: Record<string, WhatsNewEntry> = {
  '0.1.23': {
    title: 'Port forwards, fonts, and custom themes',
    items: [
      'Port forwards left idle now close themselves automatically — set the timeout (or turn it off) from Settings → Port Forwarding, which also lists every open forward across all clusters.',
      'Custom accent colors can be saved under a name and switched between, right alongside the built-in themes.',
      'Five new bundled fonts — Manrope, Plus Jakarta Sans, Outfit, Sora, and Inter — and the font picker actually applies your choice now.',
      'Update status and preferences live in one place: Settings → Updates, instead of a separate Update Center window.'
    ]
  },
  '0.1.21': {
    title: 'Automatic updates on macOS',
    items: [
      'MagicLens now downloads and installs its own updates on macOS — releases are signed and notarized, so the manual DMG download is gone.',
      'Workspaces can be given a colour, which tints their clusters in the sidebar.',
      'The menu-bar icon follows the system appearance instead of staying a fixed colour.',
      'Update notifications are readable again — the panel had been rendering without a background.'
    ]
  },
  '0.1.20': {
    title: 'Menu-bar polish',
    items: ['The menu-bar icon is now a monochrome mark that adapts to light and dark menu bars.']
  },
  '0.1.19': {
    title: 'Argo CD',
    items: [
      'New Argo CD section: dashboard, applications, application sets, projects, repositories and clusters.',
      'Sync and refresh applications directly from MagicLens, individually or in bulk.',
      'The macOS menu-bar widget shows its icon again — it was missing from packaged builds.'
    ]
  }
}

/** Highlights for a version, or null when that release has none worth showing. */
export function whatsNewFor(version: string): WhatsNewEntry | null {
  return WHATS_NEW[version] ?? null
}
