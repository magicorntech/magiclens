export type AiProviderKind = 'API' | 'LOCAL' | 'CLI'

export type AiProviderStatus = 'Needs key' | 'Ready' | 'Not installed'

export type AiProviderId =
  | 'openai'
  | 'claude'
  | 'ollama'
  | 'claude-cli'
  | 'codex'
  | 'copilot'
  | 'gemini'

export interface AiProviderConfig {
  id: AiProviderId
  name: string
  kind: AiProviderKind
  /** API key, host URL, or CLI command */
  credential: string
  model: string
  enabled: boolean
}

export interface AiAgentSettings {
  /** Active provider used as default */
  defaultProviderId: AiProviderId | null
  /** Hide the in-app assistant chrome */
  hideAssistant: boolean
  /** Pulse/glow animation on the top-bar Copilot button */
  pulseChromeIcon: boolean
  /** Optional working directory for CLI providers */
  cliWorkdir: string
  providers: AiProviderConfig[]
}

export const DEFAULT_AI_PROVIDERS: AiProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI API',
    kind: 'API',
    credential: '',
    model: 'gpt-3.5-turbo',
    enabled: false
  },
  {
    id: 'claude',
    name: 'Claude API',
    kind: 'API',
    credential: '',
    model: 'claude-sonnet-4-6',
    enabled: false
  },
  {
    id: 'ollama',
    name: 'Ollama',
    kind: 'LOCAL',
    credential: 'http://localhost:11434',
    model: 'llama3.2',
    enabled: true
  },
  {
    id: 'claude-cli',
    name: 'Claude Code CLI',
    kind: 'CLI',
    credential: 'claude',
    model: 'sonnet',
    enabled: true
  },
  {
    id: 'codex',
    name: 'Codex CLI',
    kind: 'CLI',
    credential: 'codex',
    model: 'default',
    enabled: false
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot CLI',
    kind: 'CLI',
    credential: 'gh',
    model: 'default',
    enabled: false
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    kind: 'CLI',
    credential: 'gemini',
    model: 'default',
    enabled: false
  }
]

export const DEFAULT_AI_AGENT_SETTINGS: AiAgentSettings = {
  defaultProviderId: 'ollama',
  hideAssistant: false,
  pulseChromeIcon: true,
  cliWorkdir: '',
  providers: DEFAULT_AI_PROVIDERS.map((p) => ({ ...p }))
}
