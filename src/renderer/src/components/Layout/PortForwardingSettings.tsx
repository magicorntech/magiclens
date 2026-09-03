import { useEffect, useState } from 'react'
import { Button, Empty, Space } from 'antd'
import { Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { PORT_FORWARD_IDLE_TIMEOUT_OPTIONS, type PortForwardSettings } from '@shared/types/portForward'
import { usePortForwardsAll } from '../../queries/usePortForwards'
import { Icon } from '../ui/Icon'
import { PortForwardStartedCell, PortForwardStatusCell } from '../PortForward/PortForwardStatusCell'
import { SettingsRow, SettingsSection, SettingsSelectRow } from './SettingsPrimitives'

const TIMEOUT_LABEL_KEYS: Record<number, string> = {
  0: 'settings.portForwarding.timeoutNever',
  15: 'settings.portForwarding.timeout15',
  30: 'settings.portForwarding.timeout30',
  60: 'settings.portForwarding.timeout60',
  120: 'settings.portForwarding.timeout120',
  240: 'settings.portForwarding.timeout240'
}

export function PortForwardingSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<PortForwardSettings | null>(null)
  const { data, isLoading } = usePortForwardsAll()
  const queryClient = useQueryClient()
  const [stoppingId, setStoppingId] = useState<string | null>(null)

  useEffect(() => {
    void window.api.portForward.getSettings().then(setSettings)
  }, [])

  async function handleIdleTimeoutChange(idleTimeoutMinutes: number): Promise<void> {
    const next = await window.api.portForward.setSettings({ idleTimeoutMinutes })
    setSettings(next)
  }

  async function handleStop(id: string): Promise<void> {
    setStoppingId(id)
    try {
      await window.api.portForward.stop({ id })
      await queryClient.invalidateQueries({ queryKey: ['port-forwards'] })
    } finally {
      setStoppingId(null)
    }
  }

  const sessions = data?.sessions ?? []

  return (
    <div className="ml-settings-stack">
      <SettingsSection
        title={t('settings.portForwarding.title')}
        description={t('settings.portForwarding.hint')}
      >
        <SettingsSelectRow
          title={t('settings.portForwarding.idleTimeout')}
          description={t('settings.portForwarding.idleTimeoutHint')}
          value={settings?.idleTimeoutMinutes ?? 30}
          options={PORT_FORWARD_IDLE_TIMEOUT_OPTIONS.map((minutes) => ({
            value: minutes,
            label: t(TIMEOUT_LABEL_KEYS[minutes])
          }))}
          onChange={(value) => void handleIdleTimeoutChange(value)}
          width={200}
        />
      </SettingsSection>

      <SettingsSection
        title={t('settings.portForwarding.activeTitle')}
        description={t('settings.portForwarding.activeHint')}
      >
        {!isLoading && sessions.length === 0 ? (
          <Empty description={t('settings.portForwarding.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          sessions.map((s) => (
            <SettingsRow
              key={s.id}
              title={s.label}
              description={`${s.namespace} · localhost:${s.localPort}`}
              control={
                <Space size="small">
                  <PortForwardStartedCell startedAt={s.startedAt} />
                  <PortForwardStatusCell idleSince={s.idleSince} />
                  <Button
                    size="small"
                    danger
                    icon={<Icon icon={Square} variant="detail" />}
                    loading={stoppingId === s.id}
                    onClick={() => void handleStop(s.id)}
                  >
                    {t('settings.portForwarding.stop')}
                  </Button>
                </Space>
              }
            />
          ))
        )}
      </SettingsSection>
    </div>
  )
}
