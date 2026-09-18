import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

function formatError(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function writeCrashLog(kind: string, error: unknown): void {
  try {
    const logPath = join(app.getPath('logs'), 'main-crash.log')
    appendFileSync(
      logPath,
      `[${new Date().toISOString()}] ${kind} (arch=${process.arch} platform=${process.platform})\n${formatError(error)}\n\n`
    )
  } catch {
    // best-effort diagnostics only — if we can't even write the log, there's nothing else to do
  }
}

/**
 * MagicLens disables Chromium's built-in breakpad crash reporter (see chromiumPerf.ts) and has
 * no external crash reporting service, so an uncaught exception in the main process previously
 * left zero trace beyond the OS-level "app force quit while reopening windows" dialog. This
 * gives us at least a local file to inspect when users report crashes, especially the
 * Apple-Silicon-only class of bugs (mismatched native binary architecture, GPU driver crashes)
 * that are otherwise invisible.
 *
 * Deliberately does NOT call process.exit() — Electron/Chromium's own crash handling still
 * decides whether the process should die. We only want a record of what happened first.
 */
export function installCrashLogging(): void {
  process.on('uncaughtException', (error) => {
    writeCrashLog('uncaughtException', error)
    console.error('[main] uncaughtException:', error)
  })
  process.on('unhandledRejection', (reason) => {
    writeCrashLog('unhandledRejection', reason)
    console.error('[main] unhandledRejection:', reason)
  })
}
