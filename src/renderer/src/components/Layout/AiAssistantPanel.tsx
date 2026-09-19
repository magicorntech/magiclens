import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Select, Tag, Tooltip, message } from 'antd'
import {
  Bot,
  CloudCog,
  Code2,
  Copy,
  Gauge,
  Minimize2,
  Settings2,
  ShieldCheck,
  Trash2,
  Wand2,
  Send
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { VirtualPageKey } from '@shared/types/navigation'
import { Icon } from '../ui/Icon'
import { useClusterStore } from '../../stores/clusterStore'
import { useSettingsUiStore } from '../../stores/settingsUiStore'
import { useResizableDrawerWidth } from '../../hooks/useResizableDrawerWidth'
import {
  resolveActiveProvider,
  useAiAgentStore,
  type AiChatBlock,
  type AiChatContextSnapshot,
  type AiChatMessage
} from '../../stores/aiAgentStore'
import { useBottomPanelOptional } from './BottomPanelContext'
import './aiAssistant.css'

interface AiAssistantPanelProps {
  clusterId: string
  clusterName: string
  namespace: string
  selectedKind: string | null
  selectedVirtualPage: VirtualPageKey | null
}

const WIDTH_KEY = 'ml.aiAssistantWidth'
const FEATURES = [
  { id: 'context', icon: CloudCog, titleKey: 'aiChat.featureContextTitle', bodyKey: 'aiChat.featureContextBody' },
  { id: 'mcp', icon: Wand2, titleKey: 'aiChat.featureMcpTitle', bodyKey: 'aiChat.featureMcpBody' },
  { id: 'review', icon: ShieldCheck, titleKey: 'aiChat.featureReviewTitle', bodyKey: 'aiChat.featureReviewBody' },
  { id: 'privacy', icon: Gauge, titleKey: 'aiChat.featurePrivacyTitle', bodyKey: 'aiChat.featurePrivacyBody' },
  { id: 'yaml', icon: Code2, titleKey: 'aiChat.featureYamlTitle', bodyKey: 'aiChat.featureYamlBody' }
] as const

const PROMPTS = [
  'aiChat.promptMitigate',
  'aiChat.promptExplain',
  'aiChat.promptYaml',
  'aiChat.promptLogs'
] as const

function checklistTone(status: string): string {
  if (status === 'done') return 'done'
  if (status === 'active') return 'active'
  if (status === 'rbac') return 'rbac'
  if (status === 'review') return 'review'
  return 'none'
}

function MessageBlocks({
  blocks,
  onAction
}: {
  blocks: AiChatBlock[]
  onAction: (id: string, block: AiChatBlock) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="ml-ai-chat__blocks">
      {blocks.map((block, i) => {
        if (block.type === 'text' && block.text) {
          return (
            <p key={i} className="ml-ai-chat__text">
              {block.text}
            </p>
          )
        }
        if (block.type === 'checklist' && block.items) {
          return (
            <div key={i} className="ml-ai-chat__checklist">
              {block.title ? <div className="ml-ai-chat__checklist-title">{block.title}</div> : null}
              <ul>
                {block.items.map((item) => (
                  <li key={item.id} className={`is-${checklistTone(item.status)}`}>
                    <span className="ml-ai-chat__check-dot" />
                    <span className="ml-ai-chat__check-label">{item.label}</span>
                    <Tag className="ml-ai-chat__check-tag">{item.status}</Tag>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        if (block.type === 'yaml' && block.code) {
          return (
            <div key={i} className="ml-ai-chat__yaml">
              <div className="ml-ai-chat__yaml-head">
                <span>{block.title || 'YAML'}</span>
                <Button
                  type="text"
                  size="small"
                  icon={<Icon icon={Copy} variant="micro" />}
                  onClick={() => {
                    void navigator.clipboard.writeText(block.code || '')
                    void message.success(t('aiChat.copied'))
                  }}
                />
              </div>
              <pre>
                <code>{block.code}</code>
              </pre>
            </div>
          )
        }
        if (block.type === 'actions' && block.actions) {
          return (
            <div key={i} className="ml-ai-chat__actions">
              {block.actions.map((action) => (
                <Button key={action.id} size="small" onClick={() => onAction(action.id, block)}>
                  {action.label}
                </Button>
              ))}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

function ChatBubble({
  message,
  onAction
}: {
  message: AiChatMessage
  onAction: (id: string, block: AiChatBlock) => void
}): React.JSX.Element {
  const isUser = message.role === 'user'
  return (
    <div className={`ml-ai-chat__bubble${isUser ? ' is-user' : ' is-assistant'}`}>
      {!isUser ? (
        <span className="ml-ai-chat__avatar" aria-hidden>
          <Icon icon={Bot} variant="micro" />
        </span>
      ) : null}
      <div className="ml-ai-chat__bubble-body">
        <MessageBlocks blocks={message.blocks} onAction={onAction} />
      </div>
    </div>
  )
}

export function AiAssistantPanel({
  clusterId,
  clusterName,
  namespace,
  selectedKind,
  selectedVirtualPage
}: AiAssistantPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const openVirtualPage = useClusterStore((s) => s.openVirtualPage)
  const resourceFocus = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId)?.resourceFocus ?? null)
  const openSettings = useSettingsUiStore((s) => s.openSettings)
  const bottom = useBottomPanelOptional()
  const hideAssistant = useAiAgentStore((s) => s.hideAssistant)
  const panelOpen = useAiAgentStore((s) => s.panelOpen)
  const setPanelOpen = useAiAgentStore((s) => s.setPanelOpen)
  const messages = useAiAgentStore((s) => s.messages)
  const sending = useAiAgentStore((s) => s.sending)
  const clearMessages = useAiAgentStore((s) => s.clearMessages)
  const sendUserMessage = useAiAgentStore((s) => s.sendUserMessage)
  const providers = useAiAgentStore((s) => s.providers)
  const defaultProviderId = useAiAgentStore((s) => s.defaultProviderId)
  const setDefaultProvider = useAiAgentStore((s) => s.setDefaultProvider)
  const [draft, setDraft] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)

  const { width, resizing, handleProps } = useResizableDrawerWidth({
    storageKey: WIDTH_KEY,
    defaultWidth: 380,
    minWidth: 300,
    maxWidth: 560,
    maxRatio: 0.48,
    edge: 'right'
  })

  const activeProvider = useMemo(
    () => resolveActiveProvider({ defaultProviderId, providers }),
    [defaultProviderId, providers]
  )

  const readyProviders = useMemo(() => providers, [providers])

  const ctx: AiChatContextSnapshot = useMemo(
    () => ({
      clusterId,
      clusterName,
      namespace,
      kind: selectedKind,
      virtualPage: selectedVirtualPage,
      resourceName: resourceFocus?.name ?? null
    }),
    [clusterId, clusterName, namespace, selectedKind, selectedVirtualPage, resourceFocus]
  )

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, sending])

  if (hideAssistant || !panelOpen) return <></>

  function handleAction(id: string, block: AiChatBlock): void {
    if (id === 'settings') {
      openSettings('aiAgent')
      return
    }
    if (id === 'open-security') {
      openVirtualPage(clusterId, 'security')
      return
    }
    if (id === 'open-yaml' && block.type === 'yaml' && block.code && bottom) {
      bottom.openYamlEditor({
        title: block.title || t('aiChat.yamlDraft'),
        clusterId,
        mode: 'create',
        namespace: namespace === 'ALL' ? 'default' : namespace,
        initialYaml: block.code,
        listQueryKey: ['ai-yaml', clusterId]
      })
    }
  }

  async function submit(text?: string): Promise<void> {
    const value = (text ?? draft).trim()
    if (!value) return
    setDraft('')
    await sendUserMessage(value, ctx)
  }

  const contextChips = [
    clusterName,
    namespace === 'ALL' ? t('common.allNamespaces') : namespace,
    selectedVirtualPage || selectedKind || null,
    resourceFocus?.name || null
  ].filter(Boolean) as string[]

  return (
    <aside
      className={`ml-ai-assistant${resizing ? ' is-resizing' : ''}`}
      style={{ width }}
      aria-label={t('aiChat.title')}
    >
      <button
        type="button"
        className="ml-ai-assistant__resize titlebar-no-drag"
        aria-label={t('aiChat.resize')}
        title={t('aiChat.resize')}
        {...handleProps}
      />

      <header className="ml-ai-assistant__header">
        <div className="ml-ai-assistant__identity">
          <span className="ml-ai-assistant__mark">
            <Icon icon={Bot} variant="action" />
          </span>
          <div>
            <div className="ml-ai-assistant__name">{t('aiChat.title')}</div>
            <div className="ml-ai-assistant__subtitle">{t('aiChat.subtitle')}</div>
          </div>
        </div>
        <div className="ml-ai-assistant__header-actions">
          <Tooltip title={t('aiChat.clear')}>
            <button type="button" className="ml-icon-btn" onClick={clearMessages} aria-label={t('aiChat.clear')}>
              <Icon icon={Trash2} variant="micro" />
            </button>
          </Tooltip>
          <Tooltip title={t('settings.sections.aiAgent')}>
            <button
              type="button"
              className="ml-icon-btn"
              onClick={() => openSettings('aiAgent')}
              aria-label={t('settings.sections.aiAgent')}
            >
              <Icon icon={Settings2} variant="micro" />
            </button>
          </Tooltip>
          <Tooltip title={t('aiChat.minimize')}>
            <button
              type="button"
              className="ml-icon-btn"
              onClick={() => setPanelOpen(false)}
              aria-label={t('aiChat.minimize')}
            >
              <Icon icon={Minimize2} variant="micro" />
            </button>
          </Tooltip>
        </div>
      </header>

      <div className="ml-ai-assistant__context">
        {contextChips.map((chip) => (
          <span key={chip} className="ml-ai-assistant__chip">
            {chip}
          </span>
        ))}
      </div>

      <div className="ml-ai-assistant__provider">
        <Select
          size="small"
          className="ml-ai-assistant__provider-select"
          value={activeProvider?.id}
          placeholder={t('aiChat.pickProvider')}
          options={readyProviders.map((p) => ({
            value: p.id,
            label: `${p.name} · ${p.model}${p.kind === 'LOCAL' ? ' (local)' : ''}`
          }))}
          onChange={(id) => setDefaultProvider(id)}
          popupMatchSelectWidth={false}
        />
        {activeProvider ? (
          <div className="ml-ai-assistant__provider-hint">
            {t('aiChat.usingModel', {
              name: activeProvider.name,
              model: activeProvider.model
            })}
          </div>
        ) : null}
      </div>

      <div ref={scrollerRef} className="ml-ai-assistant__scroll">
        {messages.length === 0 ? (
          <div className="ml-ai-assistant__empty">
            <div className="ml-ai-assistant__hero">
              <p className="ml-ai-assistant__badge">{t('aiChat.badge')}</p>
              <h2 className="ml-ai-assistant__headline">{t('aiChat.headline')}</h2>
              <p className="ml-ai-assistant__lead">{t('aiChat.lead')}</p>
            </div>
            <div className="ml-ai-assistant__features">
              {FEATURES.map((feature) => (
                <div key={feature.id} className="ml-ai-assistant__feature">
                  <span className="ml-ai-assistant__feature-icon">
                    <Icon icon={feature.icon} variant="action" />
                  </span>
                  <div>
                    <div className="ml-ai-assistant__feature-title">{t(feature.titleKey)}</div>
                    <div className="ml-ai-assistant__feature-body">{t(feature.bodyKey)}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="ml-ai-assistant__prompts-label">{t('aiChat.tryPrompts')}</p>
            <div className="ml-ai-assistant__prompts">
              {PROMPTS.map((key) => (
                <button key={key} type="button" className="ml-ai-assistant__prompt" onClick={() => void submit(t(key))}>
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ml-ai-chat">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} onAction={handleAction} />
            ))}
            {sending ? (
              <div className="ml-ai-chat__bubble is-assistant is-typing">
                <span className="ml-ai-chat__avatar" aria-hidden>
                  <Icon icon={Bot} variant="micro" />
                </span>
                <div className="ml-ai-chat__bubble-body">
                  <span className="ml-ai-chat__typing">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <footer className="ml-ai-assistant__composer">
        <div className="ml-ai-assistant__composer-shell">
          <Input.TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('aiChat.placeholder')}
            autoSize={{ minRows: 2, maxRows: 5 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
          />
          <div className="ml-ai-assistant__composer-row">
            <span className="ml-ai-assistant__composer-hint">{t('aiChat.composerHint')}</span>
            <Button
              type="primary"
              icon={<Icon icon={Send} variant="micro" />}
              loading={sending}
              disabled={!draft.trim()}
              onClick={() => void submit()}
            >
              {t('aiChat.send')}
            </Button>
          </div>
        </div>
      </footer>
    </aside>
  )
}

/** Always-visible chrome control to open Copilot (top bar / mobile bar). */
export function AiAssistantToggleButton(): React.JSX.Element | null {
  const { t } = useTranslation()
  const hideAssistant = useAiAgentStore((s) => s.hideAssistant)
  const pulseChromeIcon = useAiAgentStore((s) => s.pulseChromeIcon)
  const panelOpen = useAiAgentStore((s) => s.panelOpen)
  const togglePanel = useAiAgentStore((s) => s.togglePanel)
  const setPanelOpen = useAiAgentStore((s) => s.setPanelOpen)
  const openSettings = useSettingsUiStore((s) => s.openSettings)
  const pulseClass = pulseChromeIcon ? '' : ' ml-ai-chrome-btn--still'

  if (hideAssistant) {
    return (
      <Tooltip title={t('aiChat.enableInSettings')}>
        <button
          type="button"
          className={`ml-icon-btn ml-action-btn ml-ai-chrome-btn${pulseClass}`}
          onClick={() => openSettings('aiAgent')}
          aria-label={t('aiChat.title')}
        >
          <Icon icon={Bot} variant="toolbar" />
        </button>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={t('aiChat.title')}>
      <button
        type="button"
        className={`ml-icon-btn ml-action-btn ml-ai-chrome-btn${pulseClass}${panelOpen ? ' ml-icon-btn--active' : ''}`}
        onClick={() => (panelOpen ? setPanelOpen(false) : togglePanel())}
        aria-label={t('aiChat.title')}
        aria-pressed={panelOpen}
      >
        <Icon icon={Bot} variant="toolbar" />
      </button>
    </Tooltip>
  )
}
