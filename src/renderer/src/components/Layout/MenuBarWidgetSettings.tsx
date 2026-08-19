import { useEffect, useMemo, useState } from 'react'
import { Alert, Select, Slider, Switch } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PersistedClusterEntry } from '@shared/types/cluster'
import {
  MENU_BAR_ACCENTS,
  MENU_BAR_CLUSTERS_PER_PAGE,
  MENU_BAR_METRIC_IDS,
  type MenuBarAccentId,
  type MenuBarMetricId,
  type MenuBarTrayLabelId
} from '@shared/types/menuBarWidget'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { SettingsRow, SettingsSection } from './SettingsPrimitives'

const METRIC_LABEL_KEYS: Record<MenuBarMetricId, string> = {
  health: 'settings.widget.metricHealth',
  cpu: 'settings.widget.metricCpu',
  memory: 'settings.widget.metricMemory',
  pods: 'settings.widget.metricPods',
  pendingPods: 'settings.widget.metricPendingPods',
  failedPods: 'settings.widget.metricFailedPods',
  nodes: 'settings.widget.metricNodes'
}

export function MenuBarWidgetSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const prefs = useDisplaySettingsStore((s) => s.menuBarWidget)
  const update = useDisplaySettingsStore((s) => s.setMenuBarWidgetPrefs)
  const [clusters, setClusters] = useState<PersistedClusterEntry[]>([])

  useEffect(() => {
    void window.api.clusterStore.list().then((res) => setClusters(res.clusters))
  }, [])

  const clusterOptions = useMemo(
    () =>
      clusters.map((c) => ({
        value: c.id,
        label: c.customName || c.contextName
      })),
    [clusters]
  )

  return (
    <div className="ml-settings-stack">
      <SettingsSection
        title={t('settings.widget.title')}
        description={t('settings.widget.hint')}
      >
        <SettingsRow
          title={t('settings.widget.enable')}
          description={t('settings.widget.enableHint')}
          control={
            <Switch checked={prefs.enabled} onChange={(v) => void update({ enabled: v })} />
          }
        />
        <SettingsRow
          title={t('settings.widget.clusters')}
          description={t('settings.widget.clustersHint', { perPage: MENU_BAR_CLUSTERS_PER_PAGE })}
          stacked
          control={
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder={t('settings.widget.clustersPlaceholder')}
              value={prefs.clusterIds}
              options={clusterOptions}
              onChange={(ids: string[]) => void update({ clusterIds: ids })}
              optionFilterProp="label"
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title={t('settings.widget.contentTitle')}
        description={t('settings.widget.contentHint')}
      >
        {MENU_BAR_METRIC_IDS.map((id) => (
          <SettingsRow
            key={id}
            title={t(METRIC_LABEL_KEYS[id])}
            control={
              <Switch
                checked={prefs.metrics[id]}
                onChange={(v) => void update({ metrics: { ...prefs.metrics, [id]: v } })}
              />
            }
          />
        ))}
        <SettingsRow
          title={t('settings.widget.showClusterName')}
          control={
            <Switch
              checked={prefs.showClusterName}
              onChange={(v) => void update({ showClusterName: v })}
            />
          }
        />
        <SettingsRow
          title={t('settings.widget.trayLabel')}
          description={t('settings.widget.trayLabelHint')}
          control={
            <Select
              style={{ minWidth: 160 }}
              value={prefs.trayLabel}
              onChange={(v: MenuBarTrayLabelId) => void update({ trayLabel: v })}
              options={[
                { value: 'none', label: t('settings.widget.trayLabelNone') },
                { value: 'cpu', label: t('settings.widget.metricCpu') },
                { value: 'memory', label: t('settings.widget.metricMemory') },
                { value: 'pods', label: t('settings.widget.metricPods') }
              ]}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title={t('settings.widget.designTitle')}
        description={t('settings.widget.designHint')}
      >
        <SettingsRow
          title={t('settings.widget.accent')}
          control={
            <Select
              style={{ minWidth: 160 }}
              value={prefs.accent}
              onChange={(v: MenuBarAccentId) => void update({ accent: v })}
              options={(Object.keys(MENU_BAR_ACCENTS) as MenuBarAccentId[]).map((id) => ({
                value: id,
                label: (
                  <span className="ml-widget-accent-option">
                    <span
                      className="ml-widget-accent-swatch"
                      style={{ background: MENU_BAR_ACCENTS[id] }}
                    />
                    {t(`settings.widget.accent_${id}`)}
                  </span>
                )
              }))}
            />
          }
        />
        <SettingsRow
          title={t('settings.widget.compact')}
          description={t('settings.widget.compactHint')}
          control={
            <Switch checked={prefs.compact} onChange={(v) => void update({ compact: v })} />
          }
        />
        <SettingsRow
          title={t('settings.widget.colorByUsage')}
          description={t('settings.widget.colorByUsageHint')}
          control={
            <Switch
              checked={prefs.colorByUsage}
              onChange={(v) => void update({ colorByUsage: v })}
            />
          }
        />
        <SettingsRow
          title={t('settings.widget.refresh')}
          description={t('settings.widget.refreshHint', { seconds: prefs.refreshSeconds })}
          stacked
          control={
            <Slider
              min={5}
              max={60}
              step={5}
              value={prefs.refreshSeconds}
              onChange={(v: number) => void update({ refreshSeconds: v })}
            />
          }
        />
      </SettingsSection>

      <Alert
        type="info"
        showIcon
        message={t('settings.widget.nativeNote')}
        description={t('settings.widget.nativeNoteBody')}
      />
    </div>
  )
}
