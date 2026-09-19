import type { AiProviderId } from './types/aiAgent'

export type AiRunbookAction = 'login' | 'install' | 'docs' | 'pull' | 'serve'

export interface AiRunbookStep {
  title: string
  detail: string
  /** Shell command the user can copy / we can open in Terminal */
  command?: string
  action?: AiRunbookAction
  /** External URL (API key portals, docs) */
  href?: string
}

export interface AiProviderRunbook {
  id: AiProviderId
  summary: string
  credentialHint: string
  steps: AiRunbookStep[]
}

/** Integration runbook for each MagicLens AI provider. */
export const AI_PROVIDER_RUNBOOKS: Record<AiProviderId, AiProviderRunbook> = {
  openai: {
    id: 'openai',
    summary: 'Cloud API — paste an OpenAI API key, pick a model, set as Default.',
    credentialHint: 'sk-… API key',
    steps: [
      {
        title: 'Create an API key',
        detail: 'Open the OpenAI dashboard and create a secret key.',
        action: 'docs',
        href: 'https://platform.openai.com/api-keys'
      },
      {
        title: 'Paste the key in MagicLens',
        detail: 'Settings → AI Agent → OpenAI API → API key field.'
      },
      {
        title: 'Choose a model',
        detail: 'gpt-4o-mini is a good default for cost; gpt-4o for harder K8s questions.'
      },
      {
        title: 'Use as Default',
        detail: 'Click Use / Default, then ask Copilot a question.'
      }
    ]
  },
  claude: {
    id: 'claude',
    summary: 'Cloud API — Anthropic Messages API with your API key (not Claude Code CLI).',
    credentialHint: 'sk-ant-… API key',
    steps: [
      {
        title: 'Create an Anthropic API key',
        detail: 'Console → API keys. This is separate from Claude Code OAuth.',
        action: 'docs',
        href: 'https://console.anthropic.com/settings/keys'
      },
      {
        title: 'Paste the key',
        detail: 'Settings → AI Agent → Claude API → API key.'
      },
      {
        title: 'Pick a model',
        detail: 'claude-sonnet-4-6 balances speed and quality for cluster work.'
      },
      {
        title: 'Use as Default',
        detail: 'Click Use, then chat from the Copilot panel.'
      }
    ]
  },
  ollama: {
    id: 'ollama',
    summary: 'Fully local — install Ollama, pull a model, leave host at http://localhost:11434.',
    credentialHint: 'http://localhost:11434',
    steps: [
      {
        title: 'Install Ollama',
        detail: 'macOS: download from ollama.com or use Homebrew.',
        command: 'brew install ollama',
        action: 'install',
        href: 'https://ollama.com/download'
      },
      {
        title: 'Start the local server',
        detail: 'Keep this running while you use Copilot.',
        command: 'ollama serve',
        action: 'serve'
      },
      {
        title: 'Pull a model',
        detail: 'At least one model must be downloaded.',
        command: 'ollama pull llama3.2',
        action: 'pull'
      },
      {
        title: 'Point MagicLens at it',
        detail: 'Host URL http://localhost:11434 — click Check, then Use as Default.'
      }
    ]
  },
  'claude-cli': {
    id: 'claude-cli',
    summary: 'Local Claude Code binary + Anthropic OAuth (or API key via Claude Code).',
    credentialHint: 'Full path, e.g. ~/.local/bin/claude',
    steps: [
      {
        title: 'Install Claude Code',
        detail: 'Official installer puts the binary under ~/.local/bin/claude.',
        command: 'curl -fsSL https://claude.ai/install.sh | bash',
        action: 'install',
        href: 'https://docs.anthropic.com/en/docs/claude-code'
      },
      {
        title: 'Add ~/.local/bin to PATH',
        detail: 'Otherwise `claude` is “command not found” in new terminals.',
        command: 'echo \'export PATH="$HOME/.local/bin:$PATH"\' >> ~/.zshrc && source ~/.zshrc'
      },
      {
        title: 'Sign in (OAuth)',
        detail: 'Opens the browser. Required before Copilot can call the CLI.',
        command: '$HOME/.local/bin/claude auth login',
        action: 'login'
      },
      {
        title: 'Verify',
        detail: 'Should show loggedIn: true.',
        command: '$HOME/.local/bin/claude auth status'
      },
      {
        title: 'Wire MagicLens',
        detail: 'Paste the full path into the Command field, Check, then Use.'
      }
    ]
  },
  codex: {
    id: 'codex',
    summary: 'OpenAI Codex CLI — install the binary, then log in.',
    credentialHint: 'codex binary path',
    steps: [
      {
        title: 'Install Codex CLI',
        detail: 'Follow OpenAI Codex CLI install docs for your OS.',
        action: 'docs',
        href: 'https://github.com/openai/codex'
      },
      {
        title: 'Sign in',
        detail: 'Interactive login in Terminal.',
        command: 'codex login',
        action: 'login'
      },
      {
        title: 'Point MagicLens at the binary',
        detail: 'Set Command to the absolute path from `which codex`, then Use.'
      }
    ]
  },
  copilot: {
    id: 'copilot',
    summary: 'GitHub Copilot via the `gh` CLI extension.',
    credentialHint: 'gh binary path',
    steps: [
      {
        title: 'Install GitHub CLI',
        detail: 'Needed to talk to Copilot.',
        command: 'brew install gh',
        action: 'install',
        href: 'https://cli.github.com/'
      },
      {
        title: 'Install Copilot extension',
        detail: 'One-time setup.',
        command: 'gh extension install github/gh-copilot'
      },
      {
        title: 'Sign in to GitHub',
        detail: 'Browser OAuth for your account.',
        command: 'gh auth login',
        action: 'login'
      },
      {
        title: 'Wire MagicLens',
        detail: 'Command = path to `gh` (from `which gh`). Model can stay default.'
      }
    ]
  },
  gemini: {
    id: 'gemini',
    summary: 'Google Gemini CLI — install, authenticate, then select in MagicLens.',
    credentialHint: 'gemini binary path',
    steps: [
      {
        title: 'Install Gemini CLI',
        detail: 'Use the official Google Gemini CLI installer for your platform.',
        action: 'docs',
        href: 'https://github.com/google-gemini/gemini-cli'
      },
      {
        title: 'Sign in / set API key',
        detail: 'Follow the CLI’s auth flow (browser or GEMINI_API_KEY).',
        command: 'gemini',
        action: 'login'
      },
      {
        title: 'Wire MagicLens',
        detail: 'Paste `which gemini` into Command, pick a model, Use as Default.'
      }
    ]
  }
}

export function runbookFor(id: AiProviderId): AiProviderRunbook {
  return AI_PROVIDER_RUNBOOKS[id]
}
