import { useEffect, useState } from 'react'
import { Button, Space, Typography, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  bindingFromKeyboardEvent,
  shortcutParts,
  type ShortcutActionId,
  type ShortcutBinding
} from '@shared/types/keyboardShortcuts'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useClusterGroupsStore } from '../../stores/clusterGroupsStore'

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
  const { token } = theme.useToken()
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
        onClick={onClick}
        style={{
          flexShrink: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 10px',
          borderRadius: token.borderRadiusSM,
          border: `1px dashed ${isListening ? token.colorPrimary : token.colorBorder}`,
          background: token.colorBgElevated,
          color: token.colorText,
          fontFamily: 'inherit',
          fontSize: 12,
          minWidth: 88,
          justifyContent: 'center'
        }}
        aria-label={ariaLabel}
      >
        {isListening ? (
          <span style={{ color: token.colorPrimary }}>{t('settings.keyboard.pressKeys')}</span>
        ) : parts ? (
          parts.map((part) => (
            <kbd
              key={`${key}-${part}`}
              style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 4,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorFillQuaternary,
                fontSize: 11,
                lineHeight: 1.2
              }}
            >
              {part}
            </kbd>
          ))
        ) : (
          <span style={{ color: token.colorTextSecondary }}>{t('workspaces.shortcutNone')}</span>
        )}
      </button>
    )
  }

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t('settings.keyboard.hint')}
        </Typography.Text>
        <Button size="small" onClick={() => void resetShortcuts()}>
          {t('settings.keyboard.reset')}
        </Button>
      </div>

      {error ? (
        <Typography.Text type="danger" style={{ fontSize: 12 }}>
          {error}
        </Typography.Text>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ACTION_ORDER.map((id) => {
          const label = t(`settings.keyboard.actions.${id}.label`)
          const description = t(`settings.keyboard.actions.${id}.description`)
          const isListening = listening === id
          return (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '10px 12px',
                borderRadius: token.borderRadius,
                border: `1px solid ${isListening ? token.colorPrimary : token.colorBorderSecondary}`,
                background: isListening ? token.colorPrimaryBg : token.colorBgContainer
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>
                  {label}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {description}
                </Typography.Text>
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

      <div>
        <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
          {t('settings.keyboard.workspacesTitle')}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          {t('settings.keyboard.workspacesHint')}
        </Typography.Text>
        {groups.length === 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('settings.keyboard.workspacesEmpty')}
          </Typography.Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groups.map((group) => {
              const isListening = listeningWorkspaceId === group.id
              return (
                <div
                  key={group.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '10px 12px',
                    borderRadius: token.borderRadius,
                    border: `1px solid ${isListening ? token.colorPrimary : token.colorBorderSecondary}`,
                    background: isListening ? token.colorPrimaryBg : token.colorBgContainer
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>
                      {group.name}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t('settings.keyboard.workspaceOpenDesc', { count: group.clusterIds.length })}
                    </Typography.Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                    {group.shortcut && (
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => void setGroupShortcut(group.id, null)}
                      >
                        {t('workspaces.shortcutClear')}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Space>
  )
}
