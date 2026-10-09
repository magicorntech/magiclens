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

const plistBuddy = '/usr/libexec/PlistBuddy'
function setPlist(plist, key, value) {
  try {
    execFileSync(plistBuddy, ['-c', `Set :${key} ${value}`, plist], { stdio: 'ignore' })
  } catch {
    execFileSync(plistBuddy, ['-c', `Add :${key} string ${value}`, plist], { stdio: 'ignore' })
  }
}
// TCC shows CFBundleName for this bundle id. Dev Electron is com.github.Electron, so the
// microphone row stays "Electron" even after app.setName. Use the packaged app id so the
// privacy list says MagicLens.
const mainPlist = path.join(electronApp, 'Contents', 'Info.plist')
setPlist(mainPlist, 'CFBundleIdentifier', 'com.magiclens.app')
setPlist(mainPlist, 'CFBundleName', 'MagicLens')
setPlist(mainPlist, 'CFBundleDisplayName', 'MagicLens')
setPlist(mainPlist, 'NSMicrophoneUsageDescription', 'MagicLens Molly needs the microphone for voice commands.')
setPlist(
  mainPlist,
  'NSSpeechRecognitionUsageDescription',
  'MagicLens Molly uses speech recognition to turn your voice into cluster questions.'
)
for (const helper of [
  'Electron Helper',
  'Electron Helper (GPU)',
  'Electron Helper (Renderer)',
  'Electron Helper (Plugin)'
]) {
  const helperPlist = path.join(
    electronApp,
    'Contents',
    'Frameworks',
    `${helper}.app`,
    'Contents',
    'Info.plist'
  )
  if (!existsSync(helperPlist)) continue
  setPlist(helperPlist, 'CFBundleIdentifier', 'com.magiclens.app.helper')
  setPlist(helperPlist, 'CFBundleName', helper.replace('Electron', 'MagicLens'))
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
