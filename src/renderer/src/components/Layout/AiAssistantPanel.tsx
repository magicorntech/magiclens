import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Select, Tooltip } from 'antd'
import { Bot, Mic, Minimize2, Settings2, Sparkles, Square, Trash2, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { VirtualPageKey } from '@shared/types/navigation'
import { Icon } from '../ui/Icon'
import { useClusterStore } from '../../stores/clusterStore'
import { useSettingsUiStore } from '../../stores/settingsUiStore'
import { useResizableDrawerWidth } from '../../hooks/useResizableDrawerWidth'
import { resolveActiveProvider, useAiAgentStore, type AiChatMessage } from '../../stores/aiAgentStore'
import { selectActiveLines, useMollyStore, type MollyChatLine } from '../../stores/mollyStore'
import { MollyToolCharts } from '../Molly/MollyToolCharts'
import { MollyVoiceHud, orbStateToHudPhase } from '../Molly/MollyVoiceHud'
import './aiAssistant.css'

interface AiAssistantPanelProps {
  clusterId: string
  clusterName: string
  namespace: string
  selectedKind: string | null
  selectedVirtualPage: VirtualPageKey | null
}

const WIDTH_KEY = 'ml.aiAssistantWidth.v3'
const PROMPTS = ['aiChat.promptExplain', 'aiChat.promptLogs', 'aiChat.promptMitigate'] as const

function legacyMessageText(message: AiChatMessage): string {
  return message.blocks
    .map((block) => block.text || block.code || '')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n')
}

function legacyToMollyLines(messages: AiChatMessage[]): MollyChatLine[] {
  return messages.flatMap((message) => {
    const text = legacyMessageText(message)
    if (!text) return []
    const role = message.role === 'user' || message.role === 'system' ? message.role : 'assistant'
    return [{ id: `legacy-${message.id}`, role, text, at: message.createdAt }]
  })
}

export function AiAssistantPanel({
  clusterId,
  clusterName,
  namespace,
  selectedKind,
  selectedVirtualPage
}: AiAssistantPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const resourceFocus = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId)?.resourceFocus ?? null)
  const openSettings = useSettingsUiStore((s) => s.openSettings)
  const hideAssistant = useAiAgentStore((s) => s.hideAssistant)
  const panelOpen = useAiAgentStore((s) => s.panelOpen)
  const setPanelOpen = useAiAgentStore((s) => s.setPanelOpen)
  const chats = useMollyStore((s) => s.chats)
  const activeChatId = useMollyStore((s) => s.activeChatId)
  const adoptLinesIfEmpty = useMollyStore((s) => s.adoptLinesIfEmpty)
  const legacyMessages = useAiAgentStore((s) => s.messages)
  const lines = useMemo(
    () => selectActiveLines({ chats, activeChatId }),
    [chats, activeChatId]
  )
  const liveDraftUser = useMollyStore((s) => s.liveDraftUser)
  const liveDraftAssistant = useMollyStore((s) => s.liveDraftAssistant)
  const listening = useMollyStore((s) => s.listening)
  const liveConnected = useMollyStore((s) => s.liveConnected)
  const voiceActive = useMollyStore((s) => s.voiceActive)
  const voiceRms = useMollyStore((s) => s.voiceRms)
  const orbState = useMollyStore((s) => s.orbState)
  const startListening = useMollyStore((s) => s.startListening)
  const finishListening = useMollyStore((s) => s.finishListening)
  const stopAll = useMollyStore((s) => s.stopAll)
  const selectChat = useMollyStore((s) => s.selectChat)
  const createChat = useMollyStore((s) => s.createChat)
  const orderedChats = useMemo(
    () => [...chats].sort((a, b) => b.updatedAt - a.updatedAt),
    [chats]
  )
  const committedLines = lines.length > 0 ? lines : legacyToMollyLines(legacyMessages)
  const visibleLines = [
    ...committedLines,
    ...(liveDraftUser.trim()
      ? [{ id: 'live-draft-user', role: 'user' as const, text: liveDraftUser, at: Date.now() }]
      : []),
    ...(liveDraftAssistant.trim()
      ? [{ id: 'live-draft-assistant', role: 'assistant' as const, text: liveDraftAssistant, at: Date.now() }]
      : [])
  ]
  const sending = useMollyStore((s) => s.busy)
  const lastSystem = useMemo(() => {
    for (let i = committedLines.length - 1; i >= 0; i--) {
      if (committedLines[i]?.role === 'system') return committedLines[i]!.text
    }
    return null
  }, [committedLines])
  const hudPhase = orbStateToHudPhase(orbState, {
    listening,
    rms: voiceRms,
    busy: sending,
    error: lastSystem && /error|başarısız|izin|denied|503|404/i.test(lastSystem) ? lastSystem : null
  })
  const statusHint =
    orbState === 'speaking'
      ? t('molly.voiceHintMollySpeaking')
      : listening
        ? t('molly.voiceHintListening')
        : undefined

  const clearTranscript = useMollyStore((s) => s.clearTranscript)
  const sendText = useMollyStore((s) => s.sendText)
  const providers = useAiAgentStore((s) => s.providers)
  const defaultProviderId = useAiAgentStore((s) => s.defaultProviderId)
  const setDefaultProvider = useAiAgentStore((s) => s.setDefaultProvider)
  const [draft, setDraft] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)

  const { width, resizing, handleProps } = useResizableDrawerWidth({
    storageKey: WIDTH_KEY,
    defaultWidth: 560,
    minWidth: 360,
    maxWidth: 980,
    maxRatio: 0.72,
    edge: 'right'
  })

  const activeProvider = useMemo(
    () => resolveActiveProvider({ defaultProviderId, providers }),
    [defaultProviderId, providers]
  )

  const readyProviders = useMemo(() => providers, [providers])

  const contextHint = useMemo(
    () =>
      [
        `clusterId=${clusterId}`,
        clusterName ? `cluster=${clusterName}` : '',
        namespace ? `namespace=${namespace}` : '',
        selectedKind ? `kind=${selectedKind}` : '',
        selectedVirtualPage ? `page=${selectedVirtualPage}` : '',
        resourceFocus?.name ? `resource=${resourceFocus.name}` : ''
      ]
        .filter(Boolean)
        .join(', '),
    [clusterId, clusterName, namespace, selectedKind, selectedVirtualPage, resourceFocus?.name]
  )

  useEffect(() => {
    if (lines.length > 0) return
    adoptLinesIfEmpty(legacyToMollyLines(legacyMessages))
  }, [lines.length, legacyMessages, adoptLinesIfEmpty])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [visibleLines, sending])

  if (hideAssistant || !panelOpen) return <></>

  async function submit(text?: string): Promise<void> {
    const value = (text ?? draft).trim()
    if (!value || sending) return
    setDraft('')
    await sendText(value, { contextHint })
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
            <Icon icon={Sparkles} variant="action" />
          </span>
          <div>
            <div className="ml-ai-assistant__name">{t('aiChat.title')}</div>
            <div className="ml-ai-assistant__subtitle">{t('aiChat.subtitle')}</div>
          </div>
        </div>
        <div className="ml-ai-assistant__header-actions">
          <Tooltip title={t('aiChat.clear')}>
            <button type="button" className="ml-icon-btn" onClick={clearTranscript} aria-label={t('aiChat.clear')}>
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

      <div className="ml-ai-assistant__chats" aria-label={t('molly.chats')}>
        <Select
          size="small"
          className="ml-ai-assistant__chat-select"
          showSearch
          value={activeChatId}
          popupMatchSelectWidth
          optionFilterProp="label"
          listHeight={320}
          options={orderedChats.map((chat) => ({
            value: chat.id,
            label: `${chat.title} · ${chat.lines.length}`
          }))}
          onChange={(id) => selectChat(id)}
        />
        <button type="button" className="ml-btn ml-ai-assistant__chat-new" onClick={() => createChat()}>
          {t('molly.newChat')}
        </button>
      </div>

      <div ref={scrollerRef} className="ml-ai-assistant__scroll">
        {visibleLines.length === 0 ? (
          <div className="ml-ai-assistant__empty">
            <div className="ml-ai-assistant__hero">
              <p className="ml-ai-assistant__badge">{t('aiChat.badge')}</p>
              <h2 className="ml-ai-assistant__headline">{t('aiChat.headline')}</h2>
              <p className="ml-ai-assistant__lead">{t('aiChat.lead')}</p>
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
            {visibleLines.map((line) => (
              <div
                key={line.id}
                className={`ml-ai-chat__bubble${line.role === 'user' ? ' is-user' : ' is-assistant'}`}
              >
                {line.role !== 'user' ? (
                  <span className="ml-ai-chat__avatar" aria-hidden>
                    <Icon icon={line.role === 'assistant' ? Sparkles : Bot} variant="micro" />
                  </span>
                ) : null}
                <div className="ml-ai-chat__bubble-body">
                  <p className="ml-ai-chat__text">{line.text}</p>
                  {line.tools && line.tools.length > 0 ? <MollyToolCharts tools={line.tools} /> : null}
                  {line.tools && line.tools.length > 0 ? (
                    <div className="ml-ai-chat__actions">
                      {line.tools.map((tool, idx) => (
                        <span key={`${line.id}-t-${idx}`} className="ml-ai-assistant__chip">
                          {tool.name}: {tool.summary}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
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

      <div className="ml-ai-assistant__stage">
        <MollyVoiceHud
          variant="dock"
          phase={hudPhase}
          rms={voiceRms}
          caption={statusHint}
          listening={listening}
          voiceActive={voiceActive}
          busy={sending}
          onTalk={() => startListening()}
          onSend={() => finishListening()}
          onStop={() => stopAll()}
        />
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
            <div className="ml-ai-assistant__composer-actions">
              {!listening ? (
                <button type="button" className="ml-btn" onClick={() => startListening()} disabled={sending}>
                  <Icon icon={Mic} variant="micro" />
                  <span>{t('molly.startListening')}</span>
                </button>
              ) : liveConnected ? (
                <span className="ml-btn ml-btn--primary ml-ai-assistant__live">
                  <Icon icon={Mic} variant="micro" />
                  <span>
                    {orbState === 'speaking'
                      ? t('molly.hud.assistantStatus')
                      : voiceRms > 0.05
                        ? t('molly.hud.userSpeakingStatus')
                        : t('molly.hud.listeningStatus')}
                  </span>
                </span>
              ) : (
                <button type="button" className="ml-btn ml-btn--primary" onClick={() => finishListening()}>
                  <span>{t('molly.sendVoice')}</span>
                </button>
              )}
              <button
                type="button"
                className="ml-btn"
                onClick={() => stopAll()}
                disabled={!listening && !voiceActive && !sending && orbState !== 'speaking'}
              >
                <Icon icon={Square} variant="micro" />
              </button>
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
