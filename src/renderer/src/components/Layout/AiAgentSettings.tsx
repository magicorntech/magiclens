import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Select, message } from 'antd'
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  LogIn,
  Package,
  Play,
  RefreshCw
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AiProviderConfig, AiProviderId, AiProviderStatus } from '@shared/types/aiAgent'
import type { AiRunbookAction, AiRunbookStep } from '@shared/aiProviderRunbook'
import { runbookFor } from '@shared/aiProviderRunbook'
import { MOLLY_LIVE_MODEL_AUTO, MOLLY_LIVE_MODEL_OPTIONS } from '@shared/mollyModels'
import { Icon } from '../ui/Icon'
import {
  AI_MODEL_OPTIONS,
  aiProviderCredentialLabel,
  useAiAgentStore
} from '../../stores/aiAgentStore'
import { useMollyStore } from '../../stores/mollyStore'
import { SettingsRow, SettingsSection, SettingsToggleRow } from './SettingsPrimitives'
import './aiAgentSettings.css'

function actionIcon(action?: AiRunbookAction) {
  if (action === 'login') return LogIn
  if (action === 'install' || action === 'pull') return Package
  if (action === 'serve') return Play
  if (action === 'docs') return ExternalLink
  return ExternalLink
}

function actionLabelKey(action: AiRunbookAction): string {
  if (action === 'login') return 'settings.aiAgent.runbook.login'
  if (action === 'install') return 'settings.aiAgent.runbook.install'
  if (action === 'pull') return 'settings.aiAgent.runbook.pull'
  if (action === 'serve') return 'settings.aiAgent.runbook.serve'
  return 'settings.aiAgent.runbook.docs'
}

async function runSetup(
  provider: AiProviderConfig,
  action: AiRunbookAction,
  t: (key: string) => string
): Promise<void> {
  const res = await window.api.ai.openCliLogin({ provider, action })
  if (res.ok) {
    void message.info(
      action === 'docs' ? t('settings.aiAgent.runbook.docsOpened') : t('settings.aiAgent.loginOpened')
    )
  } else {
    void message.error(res.error)
  }
}

function statusTone(status: AiProviderStatus): 'ok' | 'warn' | 'off' {
  if (status === 'Ready') return 'ok'
  if (status === 'Needs key') return 'warn'
  return 'off'
}

function statusLabelKey(status: AiProviderStatus): string {
  if (status === 'Needs key') return 'settings.aiAgent.status.needsKey'
  if (status === 'Not installed') return 'settings.aiAgent.status.notInstalled'
  return 'settings.aiAgent.status.ready'
}

function RunbookPanel({ provider }: { provider: AiProviderConfig }): React.JSX.Element {
  const { t } = useTranslation()
  const book = runbookFor(provider.id)
  const primaryActions = Array.from(
    new Set(book.steps.map((s) => s.action).filter(Boolean) as AiRunbookAction[])
  )

  return (
    <div className="ml-ai-runbook">
      <p className="ml-ai-runbook__lead">{book.summary}</p>
      {primaryActions.length > 0 ? (
        <div className="ml-ai-runbook__actions">
          {primaryActions.map((action) => (
            <Button
              key={action}
              size="small"
              type={action === 'login' ? 'primary' : 'default'}
              icon={<Icon icon={actionIcon(action)} variant="micro" />}
              onClick={() => void runSetup(provider, action, t)}
            >
              {t(actionLabelKey(action))}
            </Button>
          ))}
        </div>
      ) : null}
      <ol className="ml-ai-runbook__steps">
        {book.steps.map((step, index) => (
          <RunbookStepRow key={`${step.title}-${index}`} step={step} index={index} provider={provider} />
        ))}
      </ol>
    </div>
  )
}

function RunbookStepRow({
  step,
  index,
  provider
}: {
  step: AiRunbookStep
  index: number
  provider: AiProviderConfig
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <li className="ml-ai-runbook__step">
      <span className="ml-ai-runbook__step-num" aria-hidden>
        {index + 1}
      </span>
      <div className="ml-ai-runbook__step-body">
        <div className="ml-ai-runbook__step-title">{step.title}</div>
        <p className="ml-ai-runbook__step-detail">{step.detail}</p>
        {step.command ? (
          <div className="ml-ai-runbook__cmd">
            <code>{step.command}</code>
            <Button
              type="text"
              size="small"
              icon={<Icon icon={Copy} variant="micro" />}
              onClick={() => {
                void navigator.clipboard.writeText(step.command || '')
                void message.success(t('settings.aiAgent.runbook.copied'))
              }}
              title={t('settings.aiAgent.runbook.copy')}
            />
          </div>
        ) : null}
        <div className="ml-ai-runbook__step-actions">
          {step.action ? (
            <Button
              size="small"
              icon={<Icon icon={actionIcon(step.action)} variant="micro" />}
              onClick={() => void runSetup(provider, step.action!, t)}
            >
              {t(actionLabelKey(step.action))}
            </Button>
          ) : null}
          {step.href && step.action !== 'docs' ? (
            <Button
              size="small"
              type="link"
              icon={<Icon icon={ExternalLink} variant="micro" />}
              onClick={() => void window.open(step.href, '_blank', 'noopener,noreferrer')}
            >
              {t('settings.aiAgent.runbook.openLink')}
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function ProviderCard({
  provider,
  liveStatus,
  liveModels,
  liveDetail,
  probing,
  onProbe
}: {
  provider: AiProviderConfig
  liveStatus: AiProviderStatus
  liveModels: string[]
  liveDetail?: string
  probing: boolean
  onProbe: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const defaultProviderId = useAiAgentStore((s) => s.defaultProviderId)
  const setDefaultProvider = useAiAgentStore((s) => s.setDefaultProvider)
  const updateProvider = useAiAgentStore((s) => s.updateProvider)
  const [setupOpen, setSetupOpen] = useState(false)
  const isDefault = defaultProviderId === provider.id
  const fallback = AI_MODEL_OPTIONS[provider.id]
  const models = liveModels.length ? liveModels : fallback
  const modelOptions = models.includes(provider.model)
    ? models
    : [provider.model, ...models].filter(Boolean)
  const book = runbookFor(provider.id)
  const hasLogin = book.steps.some((s) => s.action === 'login')
  const tone = statusTone(liveStatus)

  return (
    <article className={`ml-ai-card${isDefault ? ' is-default' : ''}`}>
      <header className="ml-ai-card__head">
        <div className="ml-ai-card__identity">
          <h3 className="ml-ai-card__name">{provider.name}</h3>
          <span className="ml-ai-card__kind">{provider.kind}</span>
          {isDefault ? <span className="ml-ai-card__default">{t('settings.aiAgent.default')}</span> : null}
        </div>
        <div className={`ml-ai-card__status ml-ai-card__status--${tone}`} title={liveDetail}>
          <span className="ml-ai-card__status-dot" aria-hidden />
          <span>{t(statusLabelKey(liveStatus))}</span>
        </div>
      </header>

      <div className="ml-ai-card__fields">
        <label className="ml-ai-field">
          <span className="ml-ai-field__label">
            {provider.id === 'gemini'
              ? t('settings.aiAgent.mollyGeminiKey')
              : aiProviderCredentialLabel(provider.kind)}
          </span>
          {provider.kind === 'API' ? (
            <Input.Password
              size="middle"
              placeholder={provider.id === 'gemini' ? 'AIza…' : aiProviderCredentialLabel(provider.kind)}
              value={provider.credential}
              onChange={(e) => updateProvider(provider.id, { credential: e.target.value })}
              onBlur={() => onProbe()}
              autoComplete="off"
              visibilityToggle
            />
          ) : (
            <Input
              size="middle"
              placeholder={aiProviderCredentialLabel(provider.kind)}
              value={provider.credential}
              onChange={(e) => updateProvider(provider.id, { credential: e.target.value })}
              onBlur={() => onProbe()}
              autoComplete="off"
            />
          )}
          {provider.kind === 'CLI' && !provider.credential.trim() ? (
            <span className="ml-ai-field__hint">{t('settings.aiAgent.cliMissing')}</span>
          ) : liveDetail && liveStatus !== 'Ready' ? (
            <span className="ml-ai-field__hint">{liveDetail}</span>
          ) : null}
        </label>

        <label className="ml-ai-field">
          <span className="ml-ai-field__label">{t('settings.aiAgent.model')}</span>
          <Select
            size="middle"
            value={provider.model}
            options={modelOptions.map((m) => ({ value: m, label: m }))}
            onChange={(model) => updateProvider(provider.id, { model })}
            showSearch
            style={{ width: '100%' }}
          />
        </label>
      </div>

      <footer className="ml-ai-card__foot">
        <Button
          size="small"
          loading={probing}
          icon={<Icon icon={RefreshCw} variant="micro" />}
          onClick={onProbe}
        >
          {t('settings.aiAgent.probe')}
        </Button>
        {hasLogin ? (
          <Button
            size="small"
            icon={<Icon icon={LogIn} variant="micro" />}
            onClick={() => void runSetup(provider, 'login', t)}
          >
            {t('settings.aiAgent.login')}
          </Button>
        ) : null}
        <Button
          size="small"
          type={isDefault ? 'primary' : 'default'}
          icon={isDefault ? <Icon icon={Check} variant="micro" /> : undefined}
          onClick={() => setDefaultProvider(isDefault ? null : provider.id)}
        >
          {isDefault ? t('settings.aiAgent.default') : t('settings.aiAgent.use')}
        </Button>
        <Button
          size="small"
          type="text"
          icon={<Icon icon={BookOpen} variant="micro" />}
          className={setupOpen ? 'is-active' : undefined}
          onClick={() => setSetupOpen((v) => !v)}
          aria-expanded={setupOpen}
        >
          {t('settings.aiAgent.runbook.toggle')}
        </Button>
      </footer>

      {setupOpen ? <RunbookPanel provider={provider} /> : null}
    </article>
  )
}

interface ProbeState {
  status: AiProviderStatus
  models: string[]
  detail?: string
}

export function AiAgentSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const providers = useAiAgentStore((s) => s.providers)
  const hideAssistant = useAiAgentStore((s) => s.hideAssistant)
  const setHideAssistant = useAiAgentStore((s) => s.setHideAssistant)
  const pulseChromeIcon = useAiAgentStore((s) => s.pulseChromeIcon)
  const setPulseChromeIcon = useAiAgentStore((s) => s.setPulseChromeIcon)
  const cliWorkdir = useAiAgentStore((s) => s.cliWorkdir)
  const setCliWorkdir = useAiAgentStore((s) => s.setCliWorkdir)
  const [probes, setProbes] = useState<Partial<Record<AiProviderId, ProbeState>>>({})
  const [probingId, setProbingId] = useState<AiProviderId | null>(null)

  useEffect(() => {
    const state = useAiAgentStore.getState()
    const gemini = state.providers.find((p) => p.id === 'gemini')
    if (!gemini) return
    if (
      gemini.kind !== 'API' ||
      gemini.name !== 'Google Gemini' ||
      gemini.model !== 'gemini-3.8-flash'
    ) {
      state.updateProvider('gemini', {
        kind: 'API',
        name: 'Google Gemini',
        model: 'gemini-3.8-flash',
        credential:
          gemini.credential.startsWith('AIza') || gemini.credential.length > 24
            ? gemini.credential
            : gemini.credential === 'gemini' || gemini.credential.includes('/')
              ? ''
              : gemini.credential,
        enabled: true
      })
    }
    if (gemini.credential.trim()) {
      state.setDefaultProvider('gemini')
    }
  }, [])

  const probeOne = useCallback(async (provider: AiProviderConfig) => {
    setProbingId(provider.id)
    try {
      const res = await window.api.ai.probeProvider({ provider })
      setProbes((prev) => ({
        ...prev,
        [provider.id]: {
          status: res.status,
          models: res.models ?? [],
          detail: res.detail
        }
      }))
      if (res.models?.length && !res.models.includes(provider.model)) {
        useAiAgentStore.getState().updateProvider(provider.id, { model: res.models[0] })
      }
      if (
        provider.kind === 'CLI' &&
        res.resolvedPath &&
        provider.credential.trim() !== res.resolvedPath
      ) {
        useAiAgentStore.getState().updateProvider(provider.id, { credential: res.resolvedPath })
      }
    } catch (err) {
      setProbes((prev) => ({
        ...prev,
        [provider.id]: {
          status: 'Not installed',
          models: [],
          detail: err instanceof Error ? err.message : String(err)
        }
      }))
    } finally {
      setProbingId(null)
    }
  }, [])

  useEffect(() => {
    void Promise.all(providers.map((p) => probeOne(p)))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- probe once when settings section mounts
  }, [])

  const readyCount = providers.filter((p) => {
    const live = probes[p.id]?.status
    if (live) return live === 'Ready'
    if (p.kind === 'API' || p.kind === 'LOCAL') return !!p.credential.trim()
    return !!p.credential.trim()
  }).length

  return (
    <>
      <SettingsSection
        title={t('settings.aiAgent.title')}
        description={t('settings.aiAgent.intro')}
      >
        <p className="ml-ai-meta">{t('settings.aiAgent.providersHead', { count: readyCount })}</p>
        <div className="ml-ai-list">
          {providers.map((provider) => {
            const live = probes[provider.id]
            const fallbackStatus: AiProviderStatus =
              provider.kind === 'API'
                ? provider.credential.trim()
                  ? 'Ready'
                  : 'Needs key'
                : provider.credential.trim()
                  ? 'Ready'
                  : 'Not installed'
            return (
              <ProviderCard
                key={provider.id}
                provider={provider}
                liveStatus={live?.status ?? fallbackStatus}
                liveModels={live?.models ?? []}
                liveDetail={live?.detail}
                probing={probingId === provider.id}
                onProbe={() => void probeOne(provider)}
              />
            )
          })}
        </div>
      </SettingsSection>

      <MollySettingsSection />

      <SettingsSection title={t('settings.aiAgent.optionsTitle')}>
        <SettingsRow
          title={t('settings.aiAgent.cliWorkdir')}
          description={t('settings.aiAgent.cliWorkdirHint')}
          stacked
          control={
            <Input
              placeholder={t('settings.aiAgent.cliWorkdirPlaceholder')}
              value={cliWorkdir}
              onChange={(e) => setCliWorkdir(e.target.value)}
            />
          }
        />
        <SettingsToggleRow
          title={t('settings.aiAgent.pulseChromeIcon')}
          description={t('settings.aiAgent.pulseChromeIconHint')}
          checked={pulseChromeIcon}
          onChange={setPulseChromeIcon}
        />
        <SettingsToggleRow
          title={t('settings.aiAgent.hideAssistant')}
          description={t('settings.aiAgent.hideAssistantHint')}
          checked={hideAssistant}
          onChange={setHideAssistant}
        />
      </SettingsSection>
    </>
  )
}

function MollySettingsSection(): React.JSX.Element {
  const { t } = useTranslation()
  const settings = useMollyStore((s) => s.settings)
  const patchSettings = useMollyStore((s) => s.patchSettings)

  return (
    <SettingsSection title={t('settings.aiAgent.mollyTitle')} description={t('settings.aiAgent.mollyIntro')}>
      <SettingsToggleRow
        title={t('settings.aiAgent.mollyGeminiLive')}
        description={t('settings.aiAgent.mollyGeminiLiveHint')}
        checked={settings.geminiLive !== false}
        onChange={(geminiLive) => patchSettings({ geminiLive })}
      />
      <SettingsRow
        title={t('settings.aiAgent.mollyLiveModel')}
        description={t('settings.aiAgent.mollyLiveModelHint')}
        stacked
        control={
          <Select
            style={{ width: '100%', maxWidth: 420 }}
            disabled={settings.geminiLive === false}
            value={settings.liveModel || MOLLY_LIVE_MODEL_AUTO}
            options={MOLLY_LIVE_MODEL_OPTIONS.map((o) => ({
              value: o.id,
              label:
                o.id === MOLLY_LIVE_MODEL_AUTO
                  ? t('settings.aiAgent.mollyLiveModelAuto')
                  : o.label
            }))}
            onChange={(liveModel) => patchSettings({ liveModel })}
          />
        }
      />
      <SettingsToggleRow
        title={t('settings.aiAgent.mollyWakeWord')}
        description={t('settings.aiAgent.mollyWakeWordHint')}
        checked={settings.wakeWord !== false}
        onChange={(wakeWord) => patchSettings({ wakeWord })}
      />
      <SettingsToggleRow
        title={t('settings.aiAgent.mollyBackgroundHud')}
        description={t('settings.aiAgent.mollyBackgroundHudHint')}
        checked={Boolean(settings.backgroundHud)}
        onChange={(backgroundHud) => {
          patchSettings({ backgroundHud })
          if (backgroundHud) void window.api.molly.openHud()
          else void window.api.molly.closeHud()
        }}
      />
    </SettingsSection>
  )
}
