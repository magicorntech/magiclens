import { useEffect, useState } from 'react'
import { Alert, Button, Progress, Select, Table, message } from 'antd'
import { useTranslation } from 'react-i18next'
import type { AppHostInfoResponse, AppProcessMetricsResponse } from '@shared/types/app'
import { refreshIntervalOptions, useLiveRefreshStore } from '../../stores/liveRefreshStore'
import { SettingsRow, SettingsSection } from './SettingsPrimitives'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

function formatCpu(percent: number): string {
  return `${percent.toFixed(1)}%`
}

const POLL_OPTIONS = [
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 }
]

export function DeveloperSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const [metrics, setMetrics] = useState<AppProcessMetricsResponse | null>(null)
  const [hostInfo, setHostInfo] = useState<AppHostInfoResponse | null>(null)
  const [hostError, setHostError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollMs, setPollMs] = useState(1000)
  const [clearing, setClearing] = useState(false)
  const interval = useLiveRefreshStore((s) => s.interval)
  const setInterval_ = useLiveRefreshStore((s) => s.setInterval)
  const paused = useLiveRefreshStore((s) => s.paused)
  const togglePaused = useLiveRefreshStore((s) => s.togglePaused)

  useEffect(() => {
    let cancelled = false
    const loadHost = async (): Promise<void> => {
      const api = window.api?.app?.getHostInfo
      if (typeof api !== 'function') {
        if (!cancelled) setHostError(t('settings.developer.hostApiMissing'))
        return
      }
      try {
        const next = await api()
        if (cancelled) return
        setHostInfo(next)
        setHostError(null)
      } catch (err) {
        if (!cancelled) setHostError(err instanceof Error ? err.message : String(err))
      }
    }
    void loadHost()
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    let cancelled = false
    const tick = async (): Promise<void> => {
      const api = window.api?.app?.getProcessMetrics
      if (typeof api !== 'function') {
        if (!cancelled) setError(t('settings.developer.apiMissing'))
        return
      }
      try {
        const next = await api()
        if (cancelled) return
        setMetrics(next)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), pollMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pollMs, t])

  async function handleClearCache(): Promise<void> {
    setClearing(true)
    try {
      await window.api.app.clearCache()
      message.success(t('settings.developer.cacheCleared'))
      const next = await window.api.app.getProcessMetrics()
      setMetrics(next)
      setError(null)
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err))
    } finally {
      setClearing(false)
    }
  }

  const memPct =
    metrics?.systemTotalMemoryBytes && metrics.systemTotalMemoryBytes > 0
      ? Math.min(
          100,
          Math.round((metrics.totalMemoryBytes / metrics.systemTotalMemoryBytes) * 1000) / 10
        )
      : undefined

  const refreshOptions = refreshIntervalOptions.map((opt) => ({
    ...opt,
    label: opt.value === 'manual' ? t('common.manual') : opt.label
  }))

  const cpuSpeedLabel =
    hostInfo && hostInfo.cpuSpeedMhz > 0
      ? t('settings.developer.hostCpuSpeed', { mhz: hostInfo.cpuSpeedMhz })
      : null

  const hostFacts = hostInfo
    ? [
        { label: t('settings.developer.hostHostname'), value: hostInfo.hostname },
        {
          label: t('settings.developer.hostOs'),
          value: [hostInfo.osType, hostInfo.systemVersion || hostInfo.osRelease, hostInfo.arch]
            .filter(Boolean)
            .join(' · ')
        },
        {
          label: t('settings.developer.hostCpu'),
          value: [
            hostInfo.cpuModel,
            t('settings.developer.hostCores', { count: hostInfo.cpuCores }),
            cpuSpeedLabel
          ]
            .filter(Boolean)
            .join(' · ')
        },
        {
          label: t('settings.developer.hostMemory'),
          value: t('settings.developer.hostMemoryValue', {
            free: formatBytes(hostInfo.freeMemoryBytes),
            total: formatBytes(hostInfo.totalMemoryBytes)
          })
        },
        {
          label: t('settings.developer.hostDisplay'),
          value: t('settings.developer.hostDisplayValue', {
            width: hostInfo.primaryDisplayWidth,
            height: hostInfo.primaryDisplayHeight,
            scale: hostInfo.primaryDisplayScaleFactor
          })
        },
        {
          label: t('settings.developer.hostRuntime'),
          value: `Electron ${hostInfo.electronVersion} · Chromium ${hostInfo.chromeVersion} · Node ${hostInfo.nodeVersion}`
        }
      ]
    : []

  return (
    <>
      <SettingsSection
        title={t('settings.developer.hostTitle')}
        description={t('settings.developer.hostHint')}
      >
        {hostError ? (
          <div className="ml-settings-inline-hint">
            <Alert type="warning" showIcon message={hostError} />
          </div>
        ) : (
          <dl className="ml-dev-facts">
            {hostFacts.map((fact) => (
              <div key={fact.label} className="ml-dev-facts__item">
                <dt>{fact.label}</dt>
                <dd>{fact.value || '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </SettingsSection>

      <SettingsSection
        title={t('settings.developer.liveTitle')}
        description={t('settings.developer.liveHint')}
        actions={
          <div className="ml-dev-poll">
            <span>{t('settings.developer.pollLabel')}</span>
            <Select size="small" value={pollMs} onChange={setPollMs} options={POLL_OPTIONS} style={{ width: 88 }} />
          </div>
        }
      >
        {error ? (
          <div className="ml-settings-inline-hint">
            <Alert type="warning" showIcon message={error} />
          </div>
        ) : null}

        <div className="ml-dev-metrics">
          <div className="ml-dev-metric-card">
            <span className="ml-dev-metric-card__label">{t('settings.developer.cpuTotal')}</span>
            <span className="ml-dev-metric-card__value">
              {metrics ? formatCpu(metrics.totalCpuPercent) : '—'}
            </span>
            <Progress
              percent={metrics ? Math.min(100, metrics.totalCpuPercent) : 0}
              showInfo={false}
              size="small"
              status="active"
            />
          </div>
          <div className="ml-dev-metric-card">
            <span className="ml-dev-metric-card__label">{t('settings.developer.memTotal')}</span>
            <span className="ml-dev-metric-card__value">
              {metrics ? formatBytes(metrics.totalMemoryBytes) : '—'}
            </span>
            {memPct !== undefined ? (
              <Progress percent={memPct} showInfo size="small" format={(p) => `${p}% sys`} />
            ) : (
              <span className="ml-dev-metric-card__hint">
                {t('settings.developer.processes', { count: metrics?.processCount ?? 0 })}
              </span>
            )}
          </div>
          <div className="ml-dev-metric-card">
            <span className="ml-dev-metric-card__label">{t('settings.developer.mainHeap')}</span>
            <span className="ml-dev-metric-card__value">
              {metrics ? formatBytes(metrics.mainHeapUsedBytes) : '—'}
            </span>
            <span className="ml-dev-metric-card__hint">
              {metrics
                ? t('settings.developer.heapOf', { total: formatBytes(metrics.mainHeapTotalBytes) })
                : '—'}
            </span>
          </div>
          <div className="ml-dev-metric-card">
            <span className="ml-dev-metric-card__label">{t('settings.developer.systemMem')}</span>
            <span className="ml-dev-metric-card__value ml-dev-metric-card__value--sm">
              {metrics?.systemFreeMemoryBytes != null && metrics.systemTotalMemoryBytes != null
                ? t('settings.developer.systemMemValue', {
                    free: formatBytes(metrics.systemFreeMemoryBytes),
                    total: formatBytes(metrics.systemTotalMemoryBytes)
                  })
                : '—'}
            </span>
          </div>
        </div>

        <div className="ml-dev-table-wrap">
          <Table
            size="small"
            pagination={false}
            rowKey="pid"
            dataSource={metrics?.processes ?? []}
            scroll={{ y: 200 }}
            locale={{
              emptyText: error
                ? t('settings.developer.sampleFailed')
                : t('settings.developer.noSamples')
            }}
            columns={[
              { title: t('settings.developer.colType'), dataIndex: 'type', width: 110 },
              { title: t('settings.developer.colName'), dataIndex: 'name', ellipsis: true },
              { title: 'PID', dataIndex: 'pid', width: 80 },
              {
                title: t('settings.developer.colCpu'),
                dataIndex: 'cpuPercent',
                width: 90,
                render: (v: number) => formatCpu(v),
                sorter: (a, b) => a.cpuPercent - b.cpuPercent
              },
              {
                title: t('settings.developer.colMem'),
                dataIndex: 'memoryBytes',
                width: 100,
                render: (v: number) => formatBytes(v),
                defaultSortOrder: 'descend',
                sorter: (a, b) => a.memoryBytes - b.memoryBytes
              }
            ]}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('settings.developer.controlsTitle')}
        description={t('settings.developer.controlsHint')}
      >
        <SettingsRow
          title={t('settings.developer.liveRefresh')}
          control={
            <div className="ml-dev-controls">
              <Select
                value={interval}
                onChange={setInterval_}
                options={refreshOptions}
                style={{ width: 140 }}
              />
              <Button size="small" onClick={togglePaused}>
                {paused
                  ? t('settings.developer.resumeRefresh')
                  : t('settings.developer.pauseRefresh')}
              </Button>
            </div>
          }
        />
        <div className="ml-vpn-ext-actions">
          <Button loading={clearing} onClick={() => void handleClearCache()}>
            {t('settings.developer.clearCache')}
          </Button>
        </div>
      </SettingsSection>
    </>
  )
}
