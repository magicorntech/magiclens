import { Button, Empty, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  isAlertSnoozed,
  LOCAL_ALERT_TYPES,
  type AlertHistoryEntry,
  type AlertSnooze,
  type AlertSoundId
} from '@shared/localAlerts'
import { playAlertSound } from '../../alerts/alertSound'
import { useLocalAlertsStore } from '../../stores/localAlertsStore'
import { SettingsRow, SettingsSection, SettingsSelectRow, SettingsToggleRow } from './SettingsPrimitives'

const SOUNDS: AlertSoundId[] = ['off', 'soft', 'chime', 'alarm']
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const SNOOZE_UNTIL_CLEARED = '2099-01-01T00:00:00.000Z'

function formatUntil(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  return new Date(ms).toLocaleString()
}

function isUntilCleared(until: string): boolean {
  return Date.parse(until) >= Date.parse('2090-01-01T00:00:00.000Z')
}

function matchingSnooze(
  snoozes: AlertSnooze[],
  entry: AlertHistoryEntry,
  nowMs: number
): AlertSnooze | undefined {
  return snoozes.find((snooze) => isAlertSnoozed([snooze], entry, nowMs))
}

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
  const history = useLocalAlertsStore((s) => s.history)
  const snoozes = useLocalAlertsStore((s) => s.snoozes)
  const snooze = useLocalAlertsStore((s) => s.snooze)
  const unsnooze = useLocalAlertsStore((s) => s.unsnooze)
  const nowMs = Date.now()
  const active = history.filter((entry) => entry.clearedAt == null)
  const cleared = history.filter((entry) => entry.clearedAt != null)

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

      <SettingsSection title={t('settings.alerts.historyTitle')} description={t('settings.alerts.historyHint')}>
        <span className="ml-settings-inline-hint">{t('settings.alerts.activeTitle')}</span>
        {active.length === 0 ? (
          <Empty description={t('settings.alerts.activeEmpty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          active.map((entry) => {
            const snoozed = matchingSnooze(snoozes, entry, nowMs)
            const snoozeNote = !snoozed
              ? null
              : isUntilCleared(snoozed.until)
                ? t('settings.alerts.snoozedUntilCleared')
                : t('settings.alerts.snoozedUntil', { until: formatUntil(snoozed.until) })
            return (
              <SettingsRow
                key={entry.id}
                stacked
                title={entry.title}
                description={[entry.clusterName, entry.body, snoozeNote].filter(Boolean).join(' · ')}
                control={
                  <Space size="small" wrap>
                    <Button size="small" onClick={() => snooze(entry, new Date(Date.now() + HOUR_MS).toISOString())}>
                      {t('settings.alerts.snoozeHour')}
                    </Button>
                    <Button size="small" onClick={() => snooze(entry, new Date(Date.now() + DAY_MS).toISOString())}>
                      {t('settings.alerts.snoozeDay')}
                    </Button>
                    <Button size="small" onClick={() => snooze(entry, SNOOZE_UNTIL_CLEARED)}>
                      {t('settings.alerts.snoozeCleared')}
                    </Button>
                    {snoozed ? (
                      <Button size="small" onClick={() => unsnooze(entry.id, entry.clusterId)}>
                        {t('settings.alerts.unsnooze')}
                      </Button>
                    ) : null}
                  </Space>
                }
              />
            )
          })
        )}
        <span className="ml-settings-inline-hint">{t('settings.alerts.clearedTitle')}</span>
        {cleared.length === 0 ? (
          <Empty description={t('settings.alerts.clearedEmpty')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          cleared.map((entry) => (
            <SettingsRow
              key={entry.id}
              title={entry.title}
              description={[
                entry.clusterName,
                entry.body,
                t('settings.alerts.clearedAt', { time: formatUntil(entry.clearedAt ?? '') })
              ].join(' · ')}
              control={null}
            />
          ))
        )}
      </SettingsSection>
    </>
  )
}
