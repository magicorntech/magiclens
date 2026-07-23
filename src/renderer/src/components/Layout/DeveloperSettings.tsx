import { useEffect, useState } from 'react'
import { Alert, Button, Descriptions, Progress, Select, Space, Table, Typography, message } from 'antd'
import { useTranslation } from 'react-i18next'
import type { AppHostInfoResponse, AppProcessMetricsResponse } from '@shared/types/app'
import { refreshIntervalOptions, useLiveRefreshStore } from '../../stores/liveRefreshStore'

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
        if (!cancelled) {
          setHostError(t('settings.developer.hostApiMissing'))
        }
        return
      }
      try {
        const next = await api()
        if (cancelled) return
        setHostInfo(next)
        setHostError(null)
      } catch (err) {
        if (!cancelled) {
          setHostError(err instanceof Error ? err.message : String(err))
        }
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
        if (!cancelled) {
          setError(t('settings.developer.apiMissing'))
        }
        return
      }
      try {
        const next = await api()
        if (cancelled) return
        setMetrics(next)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
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
      ? Math.min(100, Math.round((metrics.totalMemoryBytes / metrics.systemTotalMemoryBytes) * 1000) / 10)
      : undefined

  const refreshOptions = refreshIntervalOptions.map((opt) => ({
    ...opt,
    label: opt.value === 'manual' ? t('common.manual') : opt.label
  }))

  const cpuSpeedLabel =
    hostInfo && hostInfo.cpuSpeedMhz > 0
      ? t('settings.developer.hostCpuSpeed', { mhz: hostInfo.cpuSpeedMhz })
      : null

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size="large">
      <div>
        <Typography.Text strong>{t('settings.developer.hostTitle')}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
          {t('settings.developer.hostHint')}
        </Typography.Text>
        {hostError ? (
          <Alert type="warning" showIcon message={hostError} style={{ marginTop: 8 }} />
        ) : (
          <Descriptions
            size="small"
            column={1}
            bordered
            style={{ marginTop: 12, maxWidth: 520 }}
          >
            <Descriptions.Item label={t('settings.developer.hostHostname')}>
              {hostInfo?.hostname ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('settings.developer.hostOs')}>
              {hostInfo
                ? [
                    hostInfo.osType,
                    hostInfo.systemVersion || hostInfo.osRelease,
                    hostInfo.arch
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('settings.developer.hostCpu')}>
              {hostInfo
                ? [
                    hostInfo.cpuModel,
                    t('settings.developer.hostCores', { count: hostInfo.cpuCores }),
                    cpuSpeedLabel
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('settings.developer.hostMemory')}>
              {hostInfo
                ? t('settings.developer.hostMemoryValue', {
                    free: formatBytes(hostInfo.freeMemoryBytes),
                    total: formatBytes(hostInfo.totalMemoryBytes)
                  })
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('settings.developer.hostDisplay')}>
              {hostInfo
                ? t('settings.developer.hostDisplayValue', {
                    width: hostInfo.primaryDisplayWidth,
                    height: hostInfo.primaryDisplayHeight,
                    scale: hostInfo.primaryDisplayScaleFactor
                  })
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label={t('settings.developer.hostRuntime')}>
              {hostInfo
                ? `Electron ${hostInfo.electronVersion} · Chromium ${hostInfo.chromeVersion} · Node ${hostInfo.nodeVersion}`
                : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </div>

      <div>
        <Typography.Text strong>{t('settings.developer.liveTitle')}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
          {t('settings.developer.liveHint')}
        </Typography.Text>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography.Text type="secondary">{t('settings.developer.pollLabel')}</Typography.Text>
          <Select
            size="small"
            value={pollMs}
            onChange={setPollMs}
            options={POLL_OPTIONS}
            style={{ width: 100 }}
          />
        </div>
      </div>

      {error ? <Alert type="warning" showIcon message={error} /> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12
        }}
      >
        <div className="ml-dev-metric-card">
          <Typography.Text type="secondary">{t('settings.developer.cpuTotal')}</Typography.Text>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
            {metrics ? formatCpu(metrics.totalCpuPercent) : '—'}
          </div>
          <Progress
            percent={metrics ? Math.min(100, metrics.totalCpuPercent) : 0}
            showInfo={false}
            size="small"
            status="active"
          />
        </div>
        <div className="ml-dev-metric-card">
          <Typography.Text type="secondary">{t('settings.developer.memTotal')}</Typography.Text>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
            {metrics ? formatBytes(metrics.totalMemoryBytes) : '—'}
          </div>
          {memPct !== undefined ? (
            <Progress percent={memPct} showInfo size="small" format={(p) => `${p}% sys`} />
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('settings.developer.processes', { count: metrics?.processCount ?? 0 })}
            </Typography.Text>
          )}
        </div>
        <div className="ml-dev-metric-card">
          <Typography.Text type="secondary">{t('settings.developer.mainHeap')}</Typography.Text>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
            {metrics ? formatBytes(metrics.mainHeapUsedBytes) : '—'}
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {metrics
              ? t('settings.developer.heapOf', { total: formatBytes(metrics.mainHeapTotalBytes) })
              : '—'}
          </Typography.Text>
        </div>
        <div className="ml-dev-metric-card">
          <Typography.Text type="secondary">{t('settings.developer.systemMem')}</Typography.Text>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>
            {metrics?.systemFreeMemoryBytes != null && metrics.systemTotalMemoryBytes != null
              ? t('settings.developer.systemMemValue', {
                  free: formatBytes(metrics.systemFreeMemoryBytes),
                  total: formatBytes(metrics.systemTotalMemoryBytes)
                })
              : '—'}
          </div>
        </div>
      </div>

      <Table
        size="small"
        pagination={false}
        rowKey="pid"
        dataSource={metrics?.processes ?? []}
        scroll={{ y: 220 }}
        locale={{ emptyText: error ? t('settings.developer.sampleFailed') : t('settings.developer.noSamples') }}
        columns={[
          {
            title: t('settings.developer.colType'),
            dataIndex: 'type',
            width: 110
          },
          {
            title: t('settings.developer.colName'),
            dataIndex: 'name',
            ellipsis: true
          },
          {
            title: 'PID',
            dataIndex: 'pid',
            width: 80
          },
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

      <div>
        <Typography.Text strong>{t('settings.developer.controlsTitle')}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
          {t('settings.developer.controlsHint')}
        </Typography.Text>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Typography.Text>{t('settings.developer.liveRefresh')}</Typography.Text>
            <Select
              value={interval}
              onChange={setInterval_}
              options={refreshOptions}
              style={{ width: 140 }}
            />
            <Button size="small" onClick={togglePaused}>
              {paused ? t('settings.developer.resumeRefresh') : t('settings.developer.pauseRefresh')}
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button loading={clearing} onClick={() => void handleClearCache()}>
              {t('settings.developer.clearCache')}
            </Button>
            <Button onClick={() => void window.api.app.openDevTools()}>
              {t('settings.developer.openDevTools')}
            </Button>
          </div>
        </div>
      </div>
    </Space>
  )
}
