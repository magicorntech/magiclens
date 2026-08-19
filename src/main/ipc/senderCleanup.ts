import type { WebContents } from 'electron'

/**
 * Registers a cleanup callback to run when `sender` is destroyed, without piling up a new
 * `'destroyed'` listener on every call. `key` scopes idempotence: calling this again for the
 * same (sender, key) pair replaces the callback instead of adding another listener, so a
 * stream that gets restarted many times over a session doesn't leak one listener per restart.
 */
const cleanupsBySender = new WeakMap<WebContents, Map<string, () => void>>()

export function onSenderDestroyed(sender: WebContents, key: string, cleanup: () => void): void {
  let cleanups = cleanupsBySender.get(sender)
  if (!cleanups) {
    cleanups = new Map()
    cleanupsBySender.set(sender, cleanups)
    sender.once('destroyed', () => {
      for (const fn of cleanups!.values()) fn()
      cleanups!.clear()
    })
  }
  cleanups.set(key, cleanup)
}
