import { useEffect, useState } from 'react'
import { Button } from 'antd'
import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  bindingFromKeyboardEvent,
  shortcutParts,
  type ShortcutActionId,
  type ShortcutBinding
} from '@shared/types/keyboardShortcuts'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useClusterGroupsStore } from '../../stores/clusterGroupsStore'
import { ClusterAvatar } from '../ClusterTabs/ClusterAvatar'
import { Icon } from '../ui/Icon'
import { SettingsSection } from './SettingsPrimitives'

const ACTION_ORDER: ShortcutActionId[] = [
  'globalSearch',
  'toggleSplitView',
  'goToClusters',
  'goToVpn',
  'toggleSidebar',
  'openSettings'
]

export function KeyboardShortcutsSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const shortcuts = useDisplaySettingsStore((s) => s.keyboardShortcuts)
  const setShortcut = useDisplaySettingsStore((s) => s.setShortcut)
  const resetShortcuts = useDisplaySettingsStore((s) => s.resetShortcuts)
  const groups = useClusterGroupsStore((s) => s.groups)
  const setGroupShortcut = useClusterGroupsStore((s) => s.setGroupShortcut)
  const [listening, setListening] = useState<ShortcutActionId | null>(null)
  const [listeningWorkspaceId, setListeningWorkspaceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isMac = navigator.platform.includes('Mac')

  useEffect(() => {
    if (!listening && !listeningWorkspaceId) return

    function onKeyDown(event: KeyboardEvent): void {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setListening(null)
        setListeningWorkspaceId(null)
        setError(null)
        return
      }

      const binding = bindingFromKeyboardEvent(event)
      if (!binding) {
        setError(
          listeningWorkspaceId
            ? t('workspaces.shortcutRecordError')
            : t('settings.keyboard.recordError')
        )
        return
      }

      if (listeningWorkspaceId) {
        void setGroupShortcut(listeningWorkspaceId, binding).then(() => {
          setListeningWorkspaceId(null)
          setError(null)
        })
        return
      }

      void setShortcut(listening!, binding).then(() => {
        setListening(null)
        setError(null)
      })
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [listening, listeningWorkspaceId, setShortcut, setGroupShortcut, t])

  function renderBindingButton(
    key: string,
    binding: ShortcutBinding | null | undefined,
    isListening: boolean,
    onClick: () => void,
    ariaLabel: string
  ): React.JSX.Element {
    const parts = binding ? shortcutParts(binding, isMac) : null
    return (
      <button
        type="button"
        className={`ml-shortcut-key${isListening ? ' is-listening' : ''}`}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {isListening ? (
          <span className="ml-shortcut-key__listening">{t('settings.keyboard.pressKeys')}</span>
        ) : parts ? (
          parts.map((part) => (
            <kbd key={`${key}-${part}`} className="ml-shortcut-kbd">
              {part}
            </kbd>
          ))
        ) : (
          <span className="ml-shortcut-key__none">{t('workspaces.shortcutNone')}</span>
        )}
      </button>
    )
  }

  return (
    <>
      <SettingsSection
        title={t('settings.keyboard.globalTitle')}
        description={t('settings.keyboard.hint')}
        actions={
          <Button
            size="small"
            icon={<Icon icon={RotateCcw} variant="detail" />}
            onClick={() => void resetShortcuts()}
          >
            {t('settings.keyboard.reset')}
          </Button>
        }
      >
        {error && !listeningWorkspaceId ? (
          <p className="ml-settings-inline-hint ml-settings-inline-hint--danger">{error}</p>
        ) : null}
        <div className="ml-shortcut-list">
          {ACTION_ORDER.map((id) => {
            const label = t(`settings.keyboard.actions.${id}.label`)
            const description = t(`settings.keyboard.actions.${id}.description`)
            const isListening = listening === id
            return (
              <div
                key={id}
                className={`ml-shortcut-row${isListening ? ' is-listening' : ''}`}
              >
                <div className="ml-shortcut-row__copy">
                  <span className="ml-shortcut-row__title">{label}</span>
                  <span className="ml-shortcut-row__desc">{description}</span>
                </div>
                {renderBindingButton(
                  id,
                  shortcuts[id],
                  isListening,
                  () => {
                    setError(null)
                    setListeningWorkspaceId(null)
                    setListening(isListening ? null : id)
                  },
                  t('settings.keyboard.changeAria', { label })
                )}
              </div>
            )
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('settings.keyboard.workspacesTitle')}
        description={t('settings.keyboard.workspacesHint')}
      >
        {error && listeningWorkspaceId ? (
          <p className="ml-settings-inline-hint ml-settings-inline-hint--danger">{error}</p>
        ) : null}
        {groups.length === 0 ? (
          <p className="ml-settings-inline-hint">{t('settings.keyboard.workspacesEmpty')}</p>
        ) : (
          <div className="ml-shortcut-list">
            {groups.map((group) => {
              const isListening = listeningWorkspaceId === group.id
              return (
                <div
                  key={group.id}
                  className={`ml-shortcut-row${isListening ? ' is-listening' : ''}`}
                >
                  <div className="ml-shortcut-row__identity">
                    <ClusterAvatar logoUrl={group.logoUrl} name={group.name} size={28} />
                    <div className="ml-shortcut-row__copy">
                      <span className="ml-shortcut-row__title">{group.name}</span>
                      <span className="ml-shortcut-row__desc">
                        {t('settings.keyboard.workspaceOpenDesc', {
                          count: group.clusterIds.length
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="ml-shortcut-row__actions">
                    {renderBindingButton(
                      group.id,
                      group.shortcut,
                      isListening,
                      () => {
                        setError(null)
                        setListening(null)
                        setListeningWorkspaceId(isListening ? null : group.id)
                      },
                      t('settings.keyboard.changeAria', { label: group.name })
                    )}
                    {group.shortcut ? (
                      <button
                        type="button"
                        className="ml-shortcut-clear"
                        onClick={() => void setGroupShortcut(group.id, null)}
                      >
                        {t('workspaces.shortcutClear')}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SettingsSection>
    </>
  )
}
