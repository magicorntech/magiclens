import { session, systemPreferences, type Session } from 'electron'

function isMediaPermission(permission: string): boolean {
  const p = permission.toLowerCase()
  return (
    p === 'media' ||
    p === 'microphone' ||
    p === 'audio-capture' ||
    p === 'speaker' ||
    p === 'speakers' ||
    p === 'mediakeysystem'
  )
}

/** Allow Molly / Web Speech + getUserMedia mic access in the app session. */
export function installMediaPermissions(ses?: Session): void {
  const target = ses ?? session.defaultSession

  target.setPermissionRequestHandler((_wc, permission, callback) => {
    if (isMediaPermission(permission)) {
      callback(true)
      return
    }
    if (
      permission === 'notifications' ||
      permission === 'clipboard-read' ||
      permission === 'clipboard-sanitized-write'
    ) {
      callback(true)
      return
    }
    callback(false)
  })

  target.setPermissionCheckHandler((_wc, permission) => {
    if (isMediaPermission(permission)) return true
    // Trusted desktop shell — do not block unrelated permission checks.
    return true
  })

  if (process.platform === 'darwin') {
    try {
      const status = systemPreferences.getMediaAccessStatus('microphone')
      if (status !== 'granted') {
        void systemPreferences.askForMediaAccess('microphone').catch(() => {})
      }
    } catch {
      /* ignore */
    }
  }
}
