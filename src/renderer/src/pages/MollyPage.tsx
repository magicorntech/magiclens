import { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown, Input, Modal, Select, Switch, message } from 'antd'
import { MOLLY_LIVE_MODEL_AUTO, MOLLY_LIVE_MODEL_OPTIONS } from '@shared/mollyModels'
import {
  Download,
  MessageSquarePlus,
  Mic,
  MoreHorizontal,
  PanelRight,
  Pencil,
  Send,
  Settings2,
  Sparkles,
  Square,
  Trash2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../components/ui/Icon'
import { HubPageHero } from '../components/Layout/HubPageHero'
import {
  selectActiveChat,
  selectActiveLines,
  useMollyStore,
  type MollyChatThread
} from '../stores/mollyStore'
import { useSettingsUiStore } from '../stores/settingsUiStore'
import { MollyVoiceHud, orbStateToHudPhase } from '../components/Molly/MollyVoiceHud'
import { MollyToolCharts } from '../components/Molly/MollyToolCharts'
import {
  formatMollyChatJson,
  formatMollyChatMarkdown,
  sanitizeMollyExportFileName
} from '../ai/mollyChatExport'
import '../components/Molly/molly.css'

export function MollyPage(): React.JSX.Element {
  const { t } = useTranslation()
  const orbState = useMollyStore((s) => s.orbState)
  const listening = useMollyStore((s) => s.listening)
  const busy = useMollyStore((s) => s.busy)
  const chats = useMollyStore((s) => s.chats)
  const activeChatId = useMollyStore((s) => s.activeChatId)
  const lines = useMollyStore((s) => selectActiveLines(s))
  const liveDraftUser = useMollyStore((s) => s.liveDraftUser)
  const liveDraftAssistant = useMollyStore((s) => s.liveDraftAssistant)
  const settings = useMollyStore((s) => s.settings)
  const sendText = useMollyStore((s) => s.sendText)
  const startListening = useMollyStore((s) => s.startListening)
  const finishListening = useMollyStore((s) => s.finishListening)
  const stopAll = useMollyStore((s) => s.stopAll)
  const voiceActive = useMollyStore((s) => s.voiceActive)
  const liveConnected = useMollyStore((s) => s.liveConnected)
  const voiceRms = useMollyStore((s) => s.voiceRms)
  const patchSettings = useMollyStore((s) => s.patchSettings)
  const clearTranscript = useMollyStore((s) => s.clearTranscript)
  const createChat = useMollyStore((s) => s.createChat)
  const selectChat = useMollyStore((s) => s.selectChat)
  const deleteChat = useMollyStore((s) => s.deleteChat)
  const renameChat = useMollyStore((s) => s.renameChat)
  const activeChat = useMollyStore((s) => selectActiveChat(s))
  const openSettings = useSettingsUiStore((s) => s.openSettings)
  const [draft, setDraft] = useState('')
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const scroller = useRef<HTMLDivElement>(null)

  const orderedChats = useMemo(
    () => [...chats].sort((a, b) => b.updatedAt - a.updatedAt),
    [chats]
  )

  const lastSystem = useMemo(() => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i]?.role === 'system') return lines[i]!.text
    }
    return null
  }, [lines])

  const hudPhase = orbStateToHudPhase(orbState, {
    listening,
    rms: voiceRms,
    busy,
    error: lastSystem && /error|başarısız|izin|denied|503|404/i.test(lastSystem) ? lastSystem : null
  })

  const statusHint =
    listening || orbState === 'speaking'
      ? listening
        ? t('molly.voiceHintListening')
        : t('molly.voiceHintMollySpeaking')
      : undefined

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [lines.length, activeChatId])

  function submitDraft(): void {
    const text = draft
    setDraft('')
    void sendText(text)
  }

  function beginRename(chat: MollyChatThread): void {
    setRenamingId(chat.id)
    setRenameDraft(chat.title)
  }

  function commitRename(): void {
    if (!renamingId) return
    renameChat(renamingId, renameDraft)
    setRenamingId(null)
    setRenameDraft('')
  }

  function confirmDelete(chat: MollyChatThread): void {
    Modal.confirm({
      title: t('molly.deleteChatTitle'),
      content: t('molly.deleteChatBody', { title: chat.title }),
      okText: t('molly.deleteChat'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => {
        deleteChat(chat.id)
        message.success(t('molly.deletedChat'))
      }
    })
  }

  async function exportChat(chat: MollyChatThread, format: 'md' | 'json'): Promise<void> {
    const content =
      format === 'json' ? formatMollyChatJson(chat) : formatMollyChatMarkdown(chat)
    const res = await window.api.molly.exportChat({
      defaultFileName: sanitizeMollyExportFileName(chat.title),
      content,
      format
    })
    if (res.canceled) return
    if (!res.ok) {
      message.error(res.error || t('molly.exportFailed'))
      return
    }
    message.success(t('molly.exportedChat'))
  }

  const chatMenuItems = (chat: MollyChatThread) => [
    {
      key: 'rename',
      label: t('molly.renameChat'),
      icon: <Icon icon={Pencil} size={14} strokeWidth={1.75} />,
      onClick: () => beginRename(chat)
    },
    {
      key: 'export',
      label: t('molly.exportChat'),
      icon: <Icon icon={Download} size={14} strokeWidth={1.75} />,
      disabled: chat.lines.length === 0,
      children: [
        {
          key: 'md',
          label: t('molly.exportMarkdown'),
          onClick: () => void exportChat(chat, 'md')
        },
        {
          key: 'json',
          label: t('molly.exportJson'),
          onClick: () => void exportChat(chat, 'json')
        }
      ]
    },
    { type: 'divider' as const },
    {
      key: 'delete',
      label: t('molly.deleteChat'),
      danger: true,
      icon: <Icon icon={Trash2} size={14} strokeWidth={1.75} />,
      onClick: () => confirmDelete(chat)
    }
  ]

  function formatChatUpdatedAt(ms: number): string {
    const d = new Date(ms)
    const now = new Date()
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    if (sameDay) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="ml-molly-hub">
      <div className="ml-hub-glow" aria-hidden />

      <div className="ml-molly-hub__header">
        <HubPageHero
          icon={Sparkles}
          eyebrow={t('molly.brandEyebrow')}
          title={t('molly.title')}
          actions={
            <div className="ml-molly-hub__actions">
              <Select
                size="small"
                className="ml-molly-hub__model"
                popupMatchSelectWidth={false}
                disabled={settings.geminiLive === false}
                value={settings.liveModel || MOLLY_LIVE_MODEL_AUTO}
                options={MOLLY_LIVE_MODEL_OPTIONS.map((o) => ({
                  value: o.id,
                  label:
                    o.id === MOLLY_LIVE_MODEL_AUTO ? t('molly.liveModelAuto') : o.label
                }))}
                onChange={(v) => patchSettings({ liveModel: v })}
                aria-label={t('molly.liveModel')}
              />
              <button
                type="button"
                className={`ml-btn${settings.backgroundHud ? ' ml-btn--secondary ml-btn--active' : ''}`}
                onClick={() => {
                  const next = !settings.backgroundHud
                  patchSettings({ backgroundHud: next })
                  if (next) void window.api.molly.openHud()
                  else void window.api.molly.closeHud()
                }}
              >
                {settings.backgroundHud ? t('molly.hideHud') : t('molly.showHud')}
              </button>
              <button
                type="button"
                className={`ml-btn${prefsOpen ? ' ml-btn--secondary ml-btn--active' : ''}`}
                onClick={() => setPrefsOpen((v) => !v)}
                aria-pressed={prefsOpen}
              >
                <Icon icon={PanelRight} variant="action" />
                <span>{t('molly.prefs')}</span>
              </button>
              <button
                type="button"
                className="ml-btn"
                onClick={() => openSettings('aiAgent')}
              >
                <Icon icon={Settings2} variant="action" />
                <span>{t('molly.openAiSettings')}</span>
              </button>
            </div>
          }
        />
      </div>

      <div className={`ml-molly-hub__body${prefsOpen ? ' has-prefs' : ''}`}>
        <aside className="ml-molly-chats" aria-label={t('molly.chats')}>
          <div className="ml-molly-chats__head">
            <button
              type="button"
              className="ml-btn ml-btn--primary ml-molly-chats__new"
              onClick={() => createChat()}
            >
              <Icon icon={MessageSquarePlus} variant="action" />
              <span>{t('molly.newChat')}</span>
            </button>
          </div>
          <div className="ml-molly-chats__list">
            {orderedChats.map((chat) => {
              const active = chat.id === activeChatId
              const renaming = renamingId === chat.id
              return (
                <div
                  key={chat.id}
                  className={`ml-molly-chat-item${active ? ' is-active' : ''}`}
                >
                  {renaming ? (
                    <form
                      className="ml-molly-chat-item__rename"
                      onSubmit={(e) => {
                        e.preventDefault()
                        commitRename()
                      }}
                    >
                      <Input
                        size="small"
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => commitRename()}
                        onPressEnter={() => commitRename()}
                        maxLength={80}
                      />
                    </form>
                  ) : (
                    <div className="ml-molly-chat-item__row">
                      <button
                        type="button"
                        className="ml-molly-chat-item__main"
                        onClick={() => selectChat(chat.id)}
                        onDoubleClick={() => beginRename(chat)}
                      >
                        <span className="ml-molly-chat-item__title">{chat.title}</span>
                        <span className="ml-molly-chat-item__meta">
                          {chat.lines.length} · {formatChatUpdatedAt(chat.updatedAt)}
                        </span>
                      </button>
                      <Dropdown
                        menu={{ items: chatMenuItems(chat) }}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <button
                          type="button"
                          className="ml-icon-btn ml-molly-chat-item__more"
                          aria-label={t('molly.chatActions')}
                          title={t('molly.chatActions')}
                        >
                          <Icon icon={MoreHorizontal} variant="micro" />
                        </button>
                      </Dropdown>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        <section className="ml-molly-hub__main">
          {activeChat && (
            <div className="ml-molly-active-bar">
              {renamingId === activeChat.id ? (
                <Input
                  size="small"
                  className="ml-molly-active-bar__title-input"
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => commitRename()}
                  onPressEnter={() => commitRename()}
                  maxLength={80}
                />
              ) : (
                <button
                  type="button"
                  className="ml-molly-active-bar__title"
                  onDoubleClick={() => beginRename(activeChat)}
                  title={t('molly.renameChat')}
                >
                  {activeChat.title}
                </button>
              )}
              <button
                type="button"
                className="ml-btn ml-btn--ghost"
                onClick={() => clearTranscript()}
                disabled={lines.length === 0}
              >
                {t('molly.clear')}
              </button>
              <Dropdown menu={{ items: chatMenuItems(activeChat) }} trigger={['click']}>
                <button
                  type="button"
                  className="ml-icon-btn"
                  title={t('molly.chatActions')}
                  aria-label={t('molly.chatActions')}
                >
                  <Icon icon={MoreHorizontal} variant="action" />
                </button>
              </Dropdown>
            </div>
          )}

          <div className="ml-molly-transcript" ref={scroller}>
            {lines.length === 0 && !liveDraftUser.trim() && !liveDraftAssistant.trim() ? (
              <div className="ml-molly-empty">
                <div className="ml-molly-empty__mark">
                  <Icon icon={Mic} size={28} />
                </div>
                <p className="ml-molly-empty__title">{t('molly.emptyTitle')}</p>
                <p className="ml-molly-empty__body">{t('molly.empty')}</p>
              </div>
            ) : (
              lines.map((line) => (
                <div key={line.id} className={`ml-molly-line ml-molly-line--${line.role}`}>
                  <div className="ml-molly-line__role">
                    {line.role === 'user'
                      ? t('molly.roleUser')
                      : line.role === 'assistant'
                        ? t('molly.roleMolly')
                        : t('molly.roleSystem')}
                  </div>
                  <div className="ml-molly-line__text">{line.text}</div>
                  {line.tools && line.tools.length > 0 && (
                    <>
                      <MollyToolCharts tools={line.tools} />
                      <div className="ml-molly-line__tools">
                        {line.tools.map((tool, idx) => (
                          <span
                            key={`${line.id}-t-${idx}`}
                            className={`ml-molly-tool-chip${tool.ok ? '' : ' is-error'}`}
                          >
                            {tool.name}: {tool.summary}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
            {liveDraftUser.trim() ? (
              <div className="ml-molly-line ml-molly-line--user">
                <div className="ml-molly-line__role">{t('molly.roleUser')}</div>
                <div className="ml-molly-line__text">{liveDraftUser}</div>
              </div>
            ) : null}
            {liveDraftAssistant.trim() ? (
              <div className="ml-molly-line ml-molly-line--assistant">
                <div className="ml-molly-line__role">{t('molly.roleMolly')}</div>
                <div className="ml-molly-line__text">{liveDraftAssistant}</div>
              </div>
            ) : null}
          </div>

          <div className="ml-molly-dock">
            <MollyVoiceHud
              variant="dock"
              phase={hudPhase}
              rms={voiceRms}
              caption={statusHint}
              listening={listening}
              voiceActive={voiceActive}
              busy={busy}
              onTalk={() => startListening()}
              onSend={() => finishListening()}
              onStop={() => stopAll()}
            />
            <div className="ml-molly-composer">
              <Input.TextArea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('molly.placeholder')}
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (e.shiftKey) return
                  e.preventDefault()
                  submitDraft()
                }}
                disabled={busy}
              />
              <div className="ml-molly-composer__actions">
                {!listening ? (
                  <button
                    type="button"
                    className="ml-btn"
                    onClick={() => startListening()}
                    disabled={busy}
                  >
                    <Icon icon={Mic} variant="action" />
                    <span>{t('molly.startListening')}</span>
                  </button>
                ) : liveConnected ? (
                  <span className="ml-btn ml-btn--primary">
                    <Icon icon={Mic} variant="action" />
                    <span>{t('molly.hud.listeningStatus')}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="ml-btn ml-btn--primary"
                    onClick={() => finishListening()}
                  >
                    <span>{t('molly.sendVoice')}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="ml-btn"
                  onClick={() => stopAll()}
                  disabled={!listening && !voiceActive && !busy && orbState !== 'speaking'}
                >
                  <Icon icon={Square} variant="action" />
                  <span>{t('molly.stopAll')}</span>
                </button>
                <button
                  type="button"
                  className="ml-btn ml-btn--primary"
                  disabled={busy || !draft.trim()}
                  onClick={submitDraft}
                >
                  <Icon icon={Send} variant="action" />
                  <span>{t('molly.send')}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {prefsOpen && (
          <aside className="ml-molly-prefs-panel" aria-label={t('molly.prefs')}>
            <h2 className="ml-molly-prefs-panel__title">{t('molly.prefs')}</h2>
            <p className="ml-molly-prefs-panel__hint">{t('molly.readOnlyHint')}</p>
            <label className="ml-molly-pref">
              <span>{t('molly.voiceChat')}</span>
              <Switch
                size="small"
                checked={Boolean(settings.voiceChat)}
                onChange={(v) => patchSettings({ voiceChat: v })}
              />
            </label>
            <label className="ml-molly-pref">
              <span>{t('molly.geminiLive')}</span>
              <Switch
                size="small"
                checked={settings.geminiLive !== false}
                onChange={(v) => patchSettings({ geminiLive: v, speakReplies: false })}
              />
            </label>
            <label className="ml-molly-pref ml-molly-pref--stack">
              <span>{t('molly.liveModel')}</span>
              <Select
                size="small"
                style={{ width: '100%' }}
                disabled={settings.geminiLive === false}
                value={settings.liveModel || MOLLY_LIVE_MODEL_AUTO}
                options={MOLLY_LIVE_MODEL_OPTIONS.map((o) => ({
                  value: o.id,
                  label:
                    o.id === MOLLY_LIVE_MODEL_AUTO ? t('molly.liveModelAuto') : o.label
                }))}
                onChange={(v) => patchSettings({ liveModel: v })}
              />
            </label>
            <label className="ml-molly-pref">
              <span>{t('molly.wakeWord')}</span>
              <Switch
                size="small"
                checked={settings.wakeWord !== false}
                onChange={(v) => patchSettings({ wakeWord: v })}
              />
            </label>
            <label className="ml-molly-pref">
              <span>{t('molly.micEnabled')}</span>
              <Switch
                size="small"
                checked={settings.micEnabled}
                onChange={(v) => patchSettings({ micEnabled: v })}
              />
            </label>
            <label className="ml-molly-pref">
              <span>{t('molly.preferGemini')}</span>
              <Switch
                size="small"
                checked={settings.preferGemini}
                onChange={(v) => patchSettings({ preferGemini: v })}
              />
            </label>
            <label className="ml-molly-pref ml-molly-pref--stack">
              <span>{t('molly.voiceLocale')}</span>
              <Select
                size="small"
                style={{ width: '100%' }}
                value={settings.voiceLocale}
                options={[
                  { value: 'en-US', label: 'English' },
                  { value: 'tr-TR', label: 'Türkçe' },
                  { value: 'de-DE', label: 'Deutsch' },
                  { value: 'fr-FR', label: 'Français' },
                  { value: 'ja-JP', label: '日本語' },
                  { value: 'ko-KR', label: '한국어' },
                  { value: 'zh-CN', label: '中文' }
                ]}
                onChange={(v) => patchSettings({ voiceLocale: v })}
              />
            </label>
          </aside>
        )}
      </div>
    </div>
  )
}
