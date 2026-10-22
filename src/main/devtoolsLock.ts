import { app, type WebContents } from 'electron'
import { isDevToolsShortcut } from '@shared/devtoolsLock'

/** Drop debugger launch flags before Chromium reads them. Call before `app.ready`. */
export function lockPackagedDevToolsSwitches(): void {
  if (!app.isPackaged) return
  for (const name of ['remote-debugging-port', 'remote-debugging-pipe', 'inspect', 'inspect-brk']) {
    app.commandLine.removeSwitch(name)
  }
}

function sealContents(contents: WebContents): void {
  contents.on('devtools-opened', () => {
    if (!contents.isDestroyed()) contents.closeDevTools()
  })
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    if (!isDevToolsShortcut(input)) return
    event.preventDefault()
  })
  contents.on('will-attach-webview', (_event, webPreferences) => {
    webPreferences.devTools = false
    webPreferences.nodeIntegration = false
    webPreferences.nodeIntegrationInSubFrames = false
    webPreferences.contextIsolation = true
  })
}

/** Packaged builds cannot open DevTools from the menu, a shortcut, or an embedded page. */
export function installDevToolsLock(): void {
  if (!app.isPackaged) return
  app.on('web-contents-created', (_event, contents) => {
    sealContents(contents)
  })
}
