import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Select, Tag, Typography, message } from 'antd'
import {
  BookOpen,
  Bot,
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
import { Icon } from '../ui/Icon'
import {
  AI_MODEL_OPTIONS,
  aiProviderCredentialLabel,
  useAiAgentStore
} from '../../stores/aiAgentStore'
import { SettingsRow, SettingsSection, SettingsToggleRow } from './SettingsPrimitives'
import './aiAgentSettings.css'

function statusColor(status: AiProviderStatus): string {
  if (status === 'Ready') return 'success'
  if (status === 'Needs key') return 'warning'
  return 'default'
}

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

function RunbookPanel({
  provider,
  expanded
}: {
  provider: AiProviderConfig
  expanded: boolean
}): React.JSX.Element | null {
  const { t } = useTranslation()
  if (!expanded) return null

  const book = runbookFor(provider.id)
  const primaryActions = Array.from(
    new Set(book.steps.map((s) => s.action).filter(Boolean) as AiRunbookAction[])
  )

  return (
    <div className="ml-ai-runbook">
      <div className="ml-ai-runbook__summary">
        <Icon icon={BookOpen} variant="micro" />
        <div>
          <div className="ml-ai-runbook__summary-title">{t('settings.aiAgent.runbook.title')}</div>
          <p className="ml-ai-runbook__summary-body">{book.summary}</p>
          <p className="ml-ai-runbook__credential-hint">
            {t('settings.aiAgent.runbook.credential')}: {book.credentialHint}
          </p>
        </div>
      </div>

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

function ProviderRow({
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
  const [runbookOpen, setRunbookOpen] = useState(liveStatus !== 'Ready')
  const isDefault = defaultProviderId === provider.id
  const fallback = AI_MODEL_OPTIONS[provider.id]
  const models = liveModels.length ? liveModels : fallback
  const modelOptions = models.includes(provider.model)
    ? models
    : [provider.model, ...models].filter(Boolean)
  const book = runbookFor(provider.id)
  const hasLogin = book.steps.some((s) => s.action === 'login')

  useEffect(() => {
    if (liveStatus !== 'Ready') setRunbookOpen(true)
  }, [liveStatus])

  return (
    <div className={`ml-ai-provider${isDefault ? ' is-default' : ''}${runbookOpen ? ' is-expanded' : ''}`}>
      <div className="ml-ai-provider__main">
        <div className="ml-ai-provider__identity">
          <span className="ml-ai-provider__icon" aria-hidden>
            <Icon icon={Bot} variant="micro" />
          </span>
          <div className="ml-ai-provider__names">
            <div className="ml-ai-provider__title">
              <span>{provider.name}</span>
              <Tag className="ml-ai-provider__kind">{provider.kind}</Tag>
            </div>
            {liveDetail ? <span className="ml-ai-provider__hint">{liveDetail}</span> : null}
            {provider.kind === 'CLI' && !provider.credential.trim() ? (
              <span className="ml-ai-provider__hint">{t('settings.aiAgent.cliMissing')}</span>
            ) : null}
          </div>
        </div>

        <div className="ml-ai-provider__fields">
          <Input
            size="small"
            type={provider.kind === 'API' ? 'password' : 'text'}
            placeholder={aiProviderCredentialLabel(provider.kind)}
            value={provider.credential}
            onChange={(e) => updateProvider(provider.id, { credential: e.target.value })}
            onBlur={() => onProbe()}
            className="ml-ai-provider__credential"
          />
          <Select
            size="small"
            value={provider.model}
            options={modelOptions.map((m) => ({ value: m, label: m }))}
            onChange={(model) => updateProvider(provider.id, { model })}
            className="ml-ai-provider__model"
            popupMatchSelectWidth={false}
            showSearch
          />
          <Tag color={statusColor(liveStatus)} className="ml-ai-provider__status">
            {t(
              `settings.aiAgent.status.${
                liveStatus === 'Needs key'
                  ? 'needsKey'
                  : liveStatus === 'Not installed'
                    ? 'notInstalled'
                    : 'ready'
              }`
            )}
          </Tag>
          <Button
            size="small"
            loading={probing}
            icon={<Icon icon={RefreshCw} variant="micro" />}
            onClick={onProbe}
            title={t('settings.aiAgent.probe')}
          />
          {hasLogin ? (
            <Button
              size="small"
              icon={<Icon icon={LogIn} variant="micro" />}
              onClick={() => void runSetup(provider, 'login', t)}
              title={t('settings.aiAgent.login')}
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
            type={runbookOpen ? 'primary' : 'default'}
            ghost={runbookOpen}
            icon={<Icon icon={BookOpen} variant="micro" />}
            onClick={() => setRunbookOpen((v) => !v)}
            className={`ml-ai-provider__guide${runbookOpen ? ' is-open' : ''}`}
            title={t('settings.aiAgent.runbook.toggle')}
            aria-expanded={runbookOpen}
          >
            {t('settings.aiAgent.runbook.toggle')}
          </Button>
        </div>
      </div>

      <RunbookPanel provider={provider} expanded={runbookOpen} />
    </div>
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
      if (res.resolvedPath && provider.credential.trim() !== res.resolvedPath) {
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
        <Typography.Paragraph type="secondary" className="ml-ai-intro">
          {t('settings.aiAgent.privacy')}
        </Typography.Paragraph>
        <div className="ml-ai-providers-head">
          {t('settings.aiAgent.providersHead', { count: readyCount })}
        </div>
        <div className="ml-ai-providers">
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
              <ProviderRow
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
