import { useEffect, useState } from 'react'
import { Button, Space, Typography, theme } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  bindingFromKeyboardEvent,
  shortcutParts,
  type ShortcutActionId
} from '@shared/types/keyboardShortcuts'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'

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
  const [listening, setListening] = useState<ShortcutActionId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isMac = navigator.platform.includes('Mac')

  useEffect(() => {
    if (!listening) return

    function onKeyDown(event: KeyboardEvent): void {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setListening(null)
        setError(null)
        return
      }

      const binding = bindingFromKeyboardEvent(event)
      if (!binding) {
        setError(t('settings.keyboard.recordError'))
        return
      }

      void setShortcut(listening!, binding).then(() => {
        setListening(null)
        setError(null)
      })
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [listening, setShortcut, t])

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
          const parts = shortcutParts(shortcuts[id], isMac)
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
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setListening(isListening ? null : id)
                }}
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
                aria-label={t('settings.keyboard.changeAria', { label })}
              >
                {isListening ? (
                  <span style={{ color: token.colorPrimary }}>{t('settings.keyboard.pressKeys')}</span>
                ) : (
                  parts.map((part) => (
                    <kbd
                      key={`${id}-${part}`}
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
                )}
              </button>
            </div>
          )
        })}
      </div>
    </Space>
  )
}
