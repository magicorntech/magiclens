import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'

function debugLog(message: string): void {
  try {
    const logPath = join(app.getPath('logs'), 'fix-shell-path.log')
    appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`)
  } catch {
    // best-effort diagnostics only
  }
}

/**
 * macOS GUI apps launched from Finder/Dock (or via `open`) do NOT inherit the user's shell
 * profile, so `process.env.PATH` is just the minimal system default
 * (`/usr/bin:/bin:/usr/sbin:/sbin`). Tools installed via Homebrew, nvm, the Google Cloud SDK
 * (`gcloud`, `gke-gcloud-auth-plugin`), etc. live outside of that and end up "ENOENT" when
 * kubeconfig exec-based auth plugins try to spawn them - even though everything works fine
 * when the app is started from a terminal (`npm start`), which inherits the shell's full PATH.
 *
 * This reads the PATH that the user's actual login+interactive shell would produce (i.e. after
 * .zprofile/.zshrc, .bash_profile/.bashrc, etc. have run) and merges it into process.env.PATH
 * before any kubectl/cluster connections are attempted.
 *
 * The PATH is captured by having the shell redirect it straight into a temp file, rather than
 * by reading the child's stdout. Interactive shell startup can print arbitrary things to stdout
 * (oh-my-zsh/powerlevel10k instant prompt, nvm banners, motd, broken plugin errors, etc.), which
 * can interleave with or swallow a value captured via a piped `echo`. A file redirection inside
 * the shell script itself is immune to all of that.
 */
export function fixShellPath(): void {
  if (process.platform === 'win32') return
  if (!app.isPackaged) return // dev mode is already launched from a terminal with the right PATH

  let tmpDir: string | undefined
  try {
    tmpDir = mkdtempSync(join(tmpdir(), 'magiclens-path-'))
    const outFile = join(tmpDir, 'path.txt')
    const shell = process.env.SHELL || '/bin/zsh'

    execFileSync(shell, ['-ilc', `printf '%s' "$PATH" > ${JSON.stringify(outFile)}`], {
      timeout: 10_000,
      stdio: ['ignore', 'ignore', 'ignore'],
      env: { ...process.env, POWERLEVEL9K_INSTANT_PROMPT: 'off', TERM: 'dumb' }
    })

    const shellPath = readFileSync(outFile, 'utf8').trim()
    if (shellPath.length > 0) {
      process.env.PATH = shellPath
      debugLog(`success PATH.after=${process.env.PATH}`)
    } else {
      debugLog('resolved PATH was empty, leaving process.env.PATH untouched')
    }
  } catch (error) {
    debugLog(`error=${error instanceof Error ? error.stack || error.message : String(error)}`)
    console.error('[fixShellPath] Failed to resolve login shell PATH:', error)
  } finally {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true })
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
