import { spawn, execFileSync } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, isAbsolute, join } from 'node:path'
import { shell } from 'electron'
import type { AiProviderConfig, AiProviderId } from '@shared/types/aiAgent'
import type { AiRunbookAction } from '@shared/aiProviderRunbook'
import { AI_PROVIDER_RUNBOOKS } from '@shared/aiProviderRunbook'
import type {
  AiChatCompleteRequest,
  AiChatCompleteResponse,
  AiChatTurn,
  AiProbeProviderResponse
} from '@shared/types/aiChat'

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function cliEnv(): NodeJS.ProcessEnv {
  const home = homedir()
  const extras = [
    join(home, '.local/bin'),
    join(home, 'bin'),
    join(home, '.cargo/bin'),
    join(home, '.npm-global/bin'),
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/home/linuxbrew/.linuxbrew/bin'
  ]
  return {
    ...process.env,
    PATH: [...extras, process.env.PATH || '/usr/bin:/bin'].join(delimiter),
    // Prefer non-interactive Claude Code behaviour
    CI: process.env.CI || '1'
  }
}

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

function cliBinaryNames(providerId: AiProviderId): string[] {
  switch (providerId) {
    case 'claude-cli':
      return ['claude']
    case 'codex':
      return ['codex']
    case 'copilot':
      return ['gh']
    case 'gemini':
      return ['gemini']
    default:
      return [providerId]
  }
}

function cliCandidatePaths(providerId: AiProviderId, credential: string): string[] {
  const home = homedir()
  const names = cliBinaryNames(providerId)
  const out: string[] = []
  const raw = credential.trim()
  if (raw) {
    if (isAbsolute(raw)) out.push(raw)
    else out.push(raw)
  }
  for (const name of names) {
    out.push(
      join(home, '.local/bin', name),
      join(home, 'bin', name),
      join('/opt/homebrew/bin', name),
      join('/usr/local/bin', name)
    )
  }
  return out
}

/** Resolve a CLI binary to an absolute path when possible. */
export function resolveCliBinary(provider: AiProviderConfig): string | null {
  const env = cliEnv()
  const tried = new Set<string>()

  for (const candidate of cliCandidatePaths(provider.id, provider.credential)) {
    if (!candidate || tried.has(candidate)) continue
    tried.add(candidate)

    if (isAbsolute(candidate)) {
      if (isExecutable(candidate)) return candidate
      continue
    }

    // Bare command name — search PATH (augmented)
    try {
      const found = execFileSync('/usr/bin/which', [candidate], {
        env,
        encoding: 'utf8',
        timeout: 3000
      })
        .trim()
        .split('\n')[0]
      if (found && isExecutable(found)) return found
    } catch {
      // keep looking
    }
  }
  return null
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text()
    return text.slice(0, 400) || res.statusText
  } catch {
    return res.statusText
  }
}


async function chatOllama(
  provider: AiProviderConfig,
  messages: AiChatTurn[]
): Promise<AiChatCompleteResponse> {
  const base = trimSlash(provider.credential.trim() || 'http://localhost:11434')
  const model = provider.model.trim() || 'llama3.2'
  let res: Response
  try {
    res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: messages.map((m) => ({ role: m.role, content: m.content }))
      })
    })
  } catch (err) {
    return {
      ok: false,
      error: `Ollama’ya bağlanılamadı (${base}). Servisin çalıştığından emin olun. ${err instanceof Error ? err.message : String(err)}`,
      providerId: provider.id
    }
  }
  if (!res.ok) {
    return {
      ok: false,
      error: `Ollama hata ${res.status}: ${await readErrorBody(res)}`,
      providerId: provider.id
    }
  }
  const data = (await res.json()) as { message?: { content?: string } }
  const content = data.message?.content?.trim()
  if (!content) {
    return { ok: false, error: 'Ollama boş yanıt döndü.', providerId: provider.id }
  }
  return { ok: true, content, providerId: provider.id, model }
}

async function chatOpenAiCompatible(
  provider: AiProviderConfig,
  messages: AiChatTurn[]
): Promise<AiChatCompleteResponse> {
  const key = provider.credential.trim()
  if (!key) {
    return { ok: false, error: 'API key gerekli.', providerId: provider.id }
  }
  const model = provider.model.trim() || 'gpt-4o-mini'
  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content }))
      })
    })
  } catch (err) {
    return {
      ok: false,
      error: `OpenAI isteği başarısız: ${err instanceof Error ? err.message : String(err)}`,
      providerId: provider.id
    }
  }
  if (!res.ok) {
    return {
      ok: false,
      error: `OpenAI hata ${res.status}: ${await readErrorBody(res)}`,
      providerId: provider.id
    }
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    return { ok: false, error: 'OpenAI boş yanıt döndü.', providerId: provider.id }
  }
  return { ok: true, content, providerId: provider.id, model }
}

async function chatClaude(
  provider: AiProviderConfig,
  messages: AiChatTurn[]
): Promise<AiChatCompleteResponse> {
  const key = provider.credential.trim()
  if (!key) {
    return { ok: false, error: 'API key gerekli.', providerId: provider.id }
  }
  const model = provider.model.trim() || 'claude-sonnet-4-6'
  const system = messages.find((m) => m.role === 'system')?.content
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: system || undefined,
        messages: chatMessages
      })
    })
  } catch (err) {
    return {
      ok: false,
      error: `Claude isteği başarısız: ${err instanceof Error ? err.message : String(err)}`,
      providerId: provider.id
    }
  }
  if (!res.ok) {
    return {
      ok: false,
      error: `Claude hata ${res.status}: ${await readErrorBody(res)}`,
      providerId: provider.id
    }
  }
  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>
  }
  const content = data.content
    ?.filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text)
    .join('\n')
    .trim()
  if (!content) {
    return { ok: false, error: 'Claude boş yanıt döndü.', providerId: provider.id }
  }
  return { ok: true, content, providerId: provider.id, model }
}

function formatCliFailure(
  provider: AiProviderConfig,
  resolved: string,
  stderr: string,
  code: number | null
): string {
  const raw = stderr.trim() || `CLI exit code ${code} (${resolved})`
  if (/oauth|session expired|not logged in|authenticate|loggedIn":\s*false/i.test(raw)) {
    if (provider.id === 'claude-cli') {
      return (
        'Claude Code oturumu yok veya süresi dolmuş.\n' +
        'Terminal’de şunu çalıştırın:  claude auth login\n' +
        'Giriş bitince MagicLens’te tekrar deneyin. (Alternatif: Ollama veya Claude API key)'
      )
    }
    return `${raw}\nCLI’de yeniden oturum açmanız gerekiyor.`
  }
  return raw
}

function runCli(
  provider: AiProviderConfig,
  messages: AiChatTurn[],
  cliWorkdir?: string
): Promise<AiChatCompleteResponse> {
  const resolved = resolveCliBinary(provider)
  if (!resolved) {
    const hint =
      provider.id === 'claude-cli'
        ? 'Örn. /Users/<you>/.local/bin/claude — Settings → AI Agent içinde tam yolu girin.'
        : 'Settings → AI Agent içinde CLI’nin tam yolunu girin.'
    return Promise.resolve({
      ok: false,
      error: `CLI bulunamadı (${provider.credential.trim() || provider.id}). ${hint}`,
      providerId: provider.id
    })
  }

  // Fail fast when Claude Code has no valid OAuth session
  if (provider.id === 'claude-cli') {
    try {
      const statusRaw = execFileSync(resolved, ['auth', 'status'], {
        env: cliEnv(),
        encoding: 'utf8',
        timeout: 8_000
      })
      const status = JSON.parse(statusRaw) as { loggedIn?: boolean }
      if (status.loggedIn === false) {
        return Promise.resolve({
          ok: false,
          error:
            'Claude Code oturumu yok veya süresi dolmuş.\n' +
            'Terminal’de şunu çalıştırın:  claude auth login\n' +
            'Giriş bitince MagicLens’te tekrar deneyin. (Alternatif: Ollama veya Claude API key)',
          providerId: provider.id
        })
      }
    } catch {
      // If status check fails, still attempt the chat — close handler will format errors
    }
  }

  const prompt = messages.map((m) => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n')
  const model = provider.model.trim()

  return new Promise((resolve) => {
    const args: string[] = []
    if (provider.id === 'claude-cli') {
      if (model) args.push('--model', model)
      args.push('--print', '--output-format', 'text', prompt)
    } else if (provider.id === 'codex') {
      args.push('exec', prompt)
    } else if (provider.id === 'gemini') {
      if (model && model !== 'default') args.push('-m', model)
      args.push('-p', prompt)
    } else if (provider.id === 'copilot') {
      args.push('copilot', '-p', prompt)
    } else {
      args.push(prompt)
    }

    const child = spawn(resolved, args, {
      cwd: cliWorkdir?.trim() || undefined,
      env: cliEnv(),
      shell: false
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({
        ok: false,
        error: `CLI zaman aşımı (${resolved}).`,
        providerId: provider.id
      })
    }, 180_000)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        ok: false,
        error: `CLI çalıştırılamadı (${resolved}): ${err.message}`,
        providerId: provider.id
      })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      const content = stdout.trim()
      const errBlob = `${stderr}\n${stdout}`
      if (code !== 0 && !content) {
        resolve({
          ok: false,
          error: formatCliFailure(provider, resolved, errBlob, code),
          providerId: provider.id
        })
        return
      }
      if (!content) {
        resolve({
          ok: false,
          error: formatCliFailure(provider, resolved, errBlob, code),
          providerId: provider.id
        })
        return
      }
      if (/oauth|session expired|failed to authenticate/i.test(content) && content.length < 400) {
        resolve({
          ok: false,
          error: formatCliFailure(provider, resolved, content, code),
          providerId: provider.id
        })
        return
      }
      resolve({ ok: true, content, providerId: provider.id, model: model || 'default' })
    })
  })
}

export async function completeAiChat(req: AiChatCompleteRequest): Promise<AiChatCompleteResponse> {
  const { provider, messages, cliWorkdir } = req
  if (!messages.length) {
    return { ok: false, error: 'Mesaj yok.', providerId: provider.id }
  }
  if (provider.kind === 'LOCAL' || provider.id === 'ollama') {
    return chatOllama(provider, messages)
  }
  if (provider.id === 'openai') {
    return chatOpenAiCompatible(provider, messages)
  }
  if (provider.id === 'claude') {
    return chatClaude(provider, messages)
  }
  if (provider.kind === 'CLI') {
    return runCli(provider, messages, cliWorkdir)
  }
  return { ok: false, error: `Desteklenmeyen sağlayıcı: ${provider.id}`, providerId: provider.id }
}

export async function probeAiProvider(provider: AiProviderConfig): Promise<AiProbeProviderResponse> {
  if (provider.kind === 'API') {
    if (!provider.credential.trim()) {
      return { ok: false, status: 'Needs key', detail: 'API key missing' }
    }
    return { ok: true, status: 'Ready' }
  }

  if (provider.kind === 'LOCAL' || provider.id === 'ollama') {
    const base = trimSlash(provider.credential.trim() || 'http://localhost:11434')
    try {
      const res = await fetch(`${base}/api/tags`)
      if (!res.ok) {
        return { ok: false, status: 'Not installed', detail: `Ollama ${res.status}` }
      }
      const data = (await res.json()) as { models?: Array<{ name?: string }> }
      const models = (data.models ?? []).map((m) => m.name).filter((n): n is string => !!n)
      return { ok: true, status: 'Ready', models, detail: `${models.length} model` }
    } catch (err) {
      return {
        ok: false,
        status: 'Not installed',
        detail: err instanceof Error ? err.message : String(err)
      }
    }
  }

  const resolved = resolveCliBinary(provider)
  if (!resolved) {
    return {
      ok: false,
      status: 'Not installed',
      detail:
        provider.id === 'claude-cli'
          ? 'claude bulunamadı — ~/.local/bin/claude yolunu Settings’e yazın'
          : 'CLI executable not found'
    }
  }

  if (provider.id === 'claude-cli') {
    try {
      const statusRaw = execFileSync(resolved, ['auth', 'status'], {
        env: cliEnv(),
        encoding: 'utf8',
        timeout: 8_000
      })
      const status = JSON.parse(statusRaw) as { loggedIn?: boolean; authMethod?: string }
      if (status.loggedIn === false) {
        return {
          ok: false,
          status: 'Needs key',
          detail: 'OAuth yok — Terminal: claude auth login',
          resolvedPath: resolved
        }
      }
      return {
        ok: true,
        status: 'Ready',
        detail: `${resolved} · ${status.authMethod || 'logged in'}`,
        resolvedPath: resolved
      }
    } catch {
      return {
        ok: false,
        status: 'Needs key',
        detail: 'auth status okunamadı — claude auth login',
        resolvedPath: resolved
      }
    }
  }

  return { ok: true, status: 'Ready', detail: resolved, resolvedPath: resolved }
}

/** Open Terminal / browser for a runbook action (login, install, docs, …). */
export function openProviderSetup(
  provider: AiProviderConfig,
  action: AiRunbookAction = 'login'
): { ok: true } | { ok: false; error: string } {
  const book = AI_PROVIDER_RUNBOOKS[provider.id]
  const step = book.steps.find((s) => s.action === action) ?? book.steps.find((s) => s.action)

  if (action === 'docs' || (!step?.command && step?.href)) {
    const href = step?.href
    if (!href) return { ok: false, error: 'No docs URL for this provider' }
    void shell.openExternal(href)
    return { ok: true }
  }

  const resolved = resolveCliBinary(provider)
  let command = step?.command || ''

  // Prefer absolute binary when we know it
  if (provider.id === 'claude-cli' && action === 'login') {
    const bin = resolved || join(homedir(), '.local/bin/claude')
    command = `${JSON.stringify(bin)} auth login`
  } else if (provider.id === 'codex' && action === 'login') {
    const bin = resolved || 'codex'
    command = `${JSON.stringify(bin)} login`
  } else if (provider.id === 'copilot' && action === 'login') {
    const bin = resolved || 'gh'
    command = `${JSON.stringify(bin)} auth login`
  } else if (provider.id === 'gemini' && action === 'login') {
    const bin = resolved || 'gemini'
    command = JSON.stringify(bin)
  } else if (provider.id === 'ollama' && action === 'serve') {
    command = 'ollama serve'
  } else if (provider.id === 'ollama' && action === 'pull') {
    command = `ollama pull ${provider.model || 'llama3.2'}`
  } else if (provider.id === 'ollama' && action === 'install') {
    command = 'brew install ollama || open https://ollama.com/download'
  }

  if (!command) {
    if (step?.href) {
      void shell.openExternal(step.href)
      return { ok: true }
    }
    return { ok: false, error: 'No setup command for this action' }
  }

  // Expand $HOME for Terminal
  command = command.replace(/\$HOME/g, homedir())

  try {
    if (process.platform === 'darwin') {
      const script = `tell application "Terminal"
  activate
  do script ${JSON.stringify(command)}
end tell`
      execFileSync('osascript', ['-e', script], { timeout: 10_000 })
      return { ok: true }
    }
    spawn('x-terminal-emulator', ['-e', 'bash', '-lc', command], {
      detached: true,
      stdio: 'ignore'
    }).unref()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** @deprecated use openProviderSetup */
export function openCliLogin(provider: AiProviderConfig): { ok: true } | { ok: false; error: string } {
  return openProviderSetup(provider, 'login')
}
