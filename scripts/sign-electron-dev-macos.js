#!/usr/bin/env node
/**
 * macOS Electron 43+ uses UNNotification, which refuses unsigned binaries.
 * Ad-hoc sign the local Electron.app so OS notifications work in `npm run dev`.
 * Signature is wiped on electron reinstall — also run from postinstall.
 */
const { execFileSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const path = require('node:path')

if (process.platform !== 'darwin') process.exit(0)

const electronApp = path.join(
  __dirname,
  '..',
  'node_modules',
  'electron',
  'dist',
  'Electron.app'
)

if (!existsSync(electronApp)) {
  console.warn('[sign-electron-dev] Electron.app not found — skip')
  process.exit(0)
}

try {
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', electronApp], {
    stdio: 'inherit'
  })
  console.log('[sign-electron-dev] Ad-hoc signed Electron.app for macOS notifications')
} catch (err) {
  console.warn(
    '[sign-electron-dev] codesign failed:',
    err instanceof Error ? err.message : err
  )
  process.exit(0)
}
