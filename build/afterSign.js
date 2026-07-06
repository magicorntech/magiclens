const { execFileSync } = require('node:child_process')
const path = require('node:path')

/**
 * electron-builder `afterSign` hook.
 *
 * On Apple Silicon, macOS refuses to launch a Mach-O binary that has *no* code signature at all
 * (this is what causes the ""X" is damaged and can't be opened" dialog) - unlike Intel, where an
 * unsigned app merely triggers a Gatekeeper "unidentified developer" warning. Without a paid Apple
 * Developer ID certificate, electron-builder simply skips signing entirely, so every arm64 build
 * would otherwise fail to launch out of the box.
 *
 * If a real signing identity (CSC_LINK) was configured, electron-builder already produced a
 * properly signed + hardened app and this hook does nothing. Otherwise we apply a free ad-hoc
 * signature (`codesign --sign -`) so the app can at least run locally / after removing the
 * quarantine flag.
 */
module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return
  if (process.env.CSC_LINK) return // already signed with a real identity

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
  console.log(`[afterSign] Applied ad-hoc code signature to ${appPath}`)
}
