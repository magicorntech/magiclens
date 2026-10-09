import { execFile } from 'node:child_process'
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
    void ensureMicrophoneAccess(false)
  }
}

export interface MicrophoneAccess {
  granted: boolean
  status: string
}

/** Ask macOS for the microphone. Opens Privacy → Microphone when access was already refused. */
export async function ensureMicrophoneAccess(openSettings = true): Promise<MicrophoneAccess> {
  if (process.platform !== 'darwin') return { granted: true, status: 'granted' }
  let status = 'unknown'
  try {
    status = systemPreferences.getMediaAccessStatus('microphone')
  } catch {
    return { granted: true, status: 'unknown' }
  }
  if (status !== 'granted') {
    try {
      const ok = await systemPreferences.askForMediaAccess('microphone')
      status = ok ? 'granted' : systemPreferences.getMediaAccessStatus('microphone')
    } catch {
      status = systemPreferences.getMediaAccessStatus('microphone')
    }
  }
  if (status !== 'granted' && openSettings) openMicrophoneSettings()
  return { granted: status === 'granted', status }
}

function openMicrophoneSettings(): void {
  const urls = [
    'x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Microphone',
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
  ]
  const tryOpen = (index: number): void => {
    const url = urls[index]
    if (!url) return
    execFile('open', [url], (err) => {
      if (err) tryOpen(index + 1)
    })
  }
  tryOpen(0)
}
