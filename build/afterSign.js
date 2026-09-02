const { execFileSync, spawnSync } = require('node:child_process')
const path = require('node:path')

/**
 * electron-builder `afterSign` hook.
 *
 * On Apple Silicon, macOS refuses to launch a Mach-O binary that has *no* code signature at all
 * (this is what causes the ""X" is damaged and can't be opened" dialog) - unlike Intel, where an
 * unsigned app merely triggers a Gatekeeper "unidentified developer" warning. Without a paid Apple
 * Developer ID certificate, electron-builder simply skips signing entirely, so every arm64 build
 * would otherwise fail to launch out of the box. This hook applies a free ad-hoc signature
 * (`codesign --sign -`) in that case, so the app can at least run locally.
 *
 * It must never touch an app that electron-builder already signed for real: re-signing ad-hoc
 * would strip the Developer ID signature, and since notarization runs *before* this hook, it
 * would also invalidate the notarization — producing a build that looks signed but that
 * Gatekeeper rejects and that Squirrel.Mac refuses to auto-update.
 */

/** True when the app already carries a real (non-ad-hoc) code signature. */
function hasRealSignature(appPath) {
  // codesign writes its report to stderr even on success, so both streams have to be read —
  // execFileSync's return value would only carry stdout, which is empty here.
  const result = spawnSync('codesign', ['-dvv', appPath], { encoding: 'utf8' })
  const report = `${result.stdout || ''}${result.stderr || ''}`
  // An ad-hoc signature reports `Signature=adhoc` and carries no certificate chain, so the
  // presence of an Authority line is what separates a real identity from our own fallback.
  return report.includes('Authority=') && !report.includes('Signature=adhoc')
}

module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)

  // CSC_LINK covers CI, where the certificate is supplied as a file/base64 env var. A local build
  // signing against an identity already in the login keychain sets no such var, so ask the app
  // itself rather than trusting the environment to describe it.
  if (process.env.CSC_LINK || hasRealSignature(appPath)) {
    console.log('[afterSign] App is signed with a real identity — leaving the signature alone.')
    return
  }

  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
  console.log(`[afterSign] Applied ad-hoc code signature to ${appPath}`)
}
