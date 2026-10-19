import { Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { LOCAL_ALERT_TYPES, type AlertSoundId } from '@shared/localAlerts'
import { playAlertSound } from '../../alerts/alertSound'
import { useLocalAlertsStore } from '../../stores/localAlertsStore'
import { SettingsSection, SettingsSelectRow, SettingsToggleRow } from './SettingsPrimitives'

const SOUNDS: AlertSoundId[] = ['off', 'soft', 'chime', 'alarm']

export function AlertsSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const enabled = useLocalAlertsStore((s) => s.enabled)
  const osNotify = useLocalAlertsStore((s) => s.osNotify)
  const prefs = useLocalAlertsStore((s) => s.prefs)
  const setEnabled = useLocalAlertsStore((s) => s.setEnabled)
  const setOsNotify = useLocalAlertsStore((s) => s.setOsNotify)
  const setSound = useLocalAlertsStore((s) => s.setSound)
  const setSoundFor = useLocalAlertsStore((s) => s.setSoundFor)
  const setRestartThreshold = useLocalAlertsStore((s) => s.setRestartThreshold)
  const setPendingMinutes = useLocalAlertsStore((s) => s.setPendingMinutes)
  const setTypeEnabled = useLocalAlertsStore((s) => s.setTypeEnabled)

  return (
    <>
      <SettingsSection title={t('settings.alerts.watchTitle')} description={t('settings.alerts.watchHint')}>
        <SettingsToggleRow
          title={t('settings.alerts.enabled')}
          description={t('settings.alerts.enabledHint')}
          checked={enabled}
          onChange={setEnabled}
        />
        <SettingsToggleRow
          title={t('settings.alerts.os')}
          description={t('settings.alerts.osHint')}
          checked={osNotify}
          onChange={setOsNotify}
          disabled={!enabled}
        />
        <div className="ml-settings-row">
          <div className="ml-settings-row__copy">
            <span className="ml-settings-row__title">{t('settings.alerts.permission')}</span>
            <span className="ml-settings-row__desc">{t('settings.alerts.permissionHint')}</span>
          </div>
          <div className="ml-settings-row__control">
            <Space>
              <Button size="small" onClick={() => void window.api.alerts.requestPermission()}>
                {t('settings.alerts.allow')}
              </Button>
              <Button size="small" onClick={() => void window.api.alerts.openSystemSettings()}>
                {t('settings.alerts.system')}
              </Button>
            </Space>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.alerts.soundTitle')} description={t('settings.alerts.soundHint')}>
        <SettingsSelectRow
          title={t('settings.alerts.sound')}
          value={prefs.sound}
          options={SOUNDS.map((id) => ({ value: id, label: t(`settings.alerts.sounds.${id}`) }))}
          onChange={(sound) => {
            setSound(sound)
            playAlertSound(sound)
          }}
          width={220}
        />
        <SettingsSelectRow
          title={t('settings.alerts.soundFor')}
          description={t('settings.alerts.soundForHint')}
          value={prefs.soundFor}
          options={[
            { value: 'all', label: t('settings.alerts.soundForAll') },
            { value: 'errors', label: t('settings.alerts.soundForErrors') }
          ]}
          onChange={setSoundFor}
          width={220}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.alerts.thresholdsTitle')} description={t('settings.alerts.thresholdsHint')}>
        <SettingsSelectRow
          title={t('settings.alerts.restarts')}
          value={prefs.restartThreshold}
          options={[5, 10, 20, 50].map((n) => ({ value: n, label: String(n) }))}
          onChange={setRestartThreshold}
          width={120}
        />
        <SettingsSelectRow
          title={t('settings.alerts.pending')}
          value={prefs.pendingMinutes}
          options={[5, 10, 30, 60].map((n) => ({ value: n, label: t('settings.alerts.minutes', { count: n }) }))}
          onChange={setPendingMinutes}
          width={160}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.alerts.typesTitle')} description={t('settings.alerts.typesHint')}>
        {LOCAL_ALERT_TYPES.map((type) => (
          <SettingsToggleRow
            key={type}
            title={t(`settings.alerts.types.${type}`)}
            description={t(`settings.alerts.typeHints.${type}`)}
            checked={prefs.types[type] !== false}
            onChange={(on) => setTypeEnabled(type, on)}
            disabled={!enabled}
          />
        ))}
      </SettingsSection>
    </>
  )
}
