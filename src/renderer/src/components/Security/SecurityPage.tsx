import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Empty, Table, Tabs, Tag, Tooltip, message } from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Download, RefreshCw, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  SecurityEntryPoint,
  SecurityReport,
  SecuritySeverity,
  SecurityVector,
  SecurityVulnerability
} from '@shared/types/security'
import { Icon } from '../ui/Icon'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import {
  DEFAULT_TABLE_PAGE_SIZE,
  embeddedTablePagination,
  readPaginationChange,
  type TablePaginationState
} from '../../utils/tablePagination'
import './security.css'

interface SecurityPageProps {
  clusterId: string
}

type DetailTab = 'vulnerabilities' | 'entryPoints' | 'vectors'

const SEVERITY_COLOR: Record<SecuritySeverity, string> = {
  Critical: '#d94c4c',
  High: '#e07a3a',
  Medium: '#e3b341',
  Low: '#94a3b8'
}

const INITIAL_SCAN_MIN_MS = 900

function formatScanTime(iso: string, locale: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function riskTone(label: SecurityReport['riskLabel']): string {
  if (label === 'Critical Risk') return 'critical'
  if (label === 'High Risk') return 'high'
  if (label === 'Medium Risk') return 'medium'
  if (label === 'Low Risk') return 'low'
  return 'healthy'
}

function SecurityScanLoader({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="ml-security-loader" role="status" aria-live="polite">
      <div className="ml-security-loader__orb">
        <span className="ml-security-loader__ring ml-security-loader__ring--outer" />
        <span className="ml-security-loader__ring ml-security-loader__ring--mid" />
        <span className="ml-security-loader__pulse" />
        <span className="ml-security-loader__icon">
          <Icon icon={ShieldAlert} size={36} strokeWidth={1.6} />
        </span>
      </div>
      <p className="ml-security-loader__label">{label}</p>
    </div>
  )
}

export function SecurityPage({ clusterId }: SecurityPageProps): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const isDark = useResolvedDarkMode()
  const [report, setReport] = useState<SecurityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<DetailTab>('vulnerabilities')
  const [pagination, setPagination] = useState<TablePaginationState>({
    current: 1,
    pageSize: DEFAULT_TABLE_PAGE_SIZE
  })

  const chartInk = isDark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.45)'
  const chartTick = isDark ? '#94a3b8' : '#64748b'
  const tooltipStyle = useMemo(
    () => ({
      background: 'var(--ml-bg-elevated)',
      border: '1px solid var(--ml-border)',
      borderRadius: 0,
      color: 'var(--ml-text)',
      fontSize: 12,
      boxShadow: 'var(--ml-shadow-lg)'
    }),
    []
  )

  const load = useCallback(
    async (manual = false) => {
      if (manual) setScanning(true)
      else setLoading(true)
      setError(null)
      const started = Date.now()
      try {
        const res = await window.api.security.scan({ clusterId })
        if (!manual) {
          const wait = INITIAL_SCAN_MIN_MS - (Date.now() - started)
          if (wait > 0) await new Promise((r) => setTimeout(r, wait))
        }
        if ('error' in res) {
          setError(res.error)
          setReport(null)
        } else {
          setReport(res)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setReport(null)
      } finally {
        setLoading(false)
        setScanning(false)
      }
    },
    [clusterId]
  )

  useEffect(() => {
    setReport(null)
    setError(null)
    setPagination({ current: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE })
    void load()
  }, [load])

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, [tab])

  const typeData = useMemo(
    () => (report?.typeCounts ?? []).map((row) => ({ axis: row.axis, count: row.count })),
    [report]
  )

  const severityData = useMemo(
    () =>
      (report?.severityCounts ?? []).map((row) => ({
        level: row.level,
        count: row.count,
        fill: SEVERITY_COLOR[row.level]
      })),
    [report]
  )

  const nsData = useMemo(
    () =>
      (report?.namespaceCounts ?? []).slice(0, 8).map((row) => ({
        ns: row.namespace.length > 14 ? `${row.namespace.slice(0, 12)}…` : row.namespace,
        full: row.namespace,
        low: row.low,
        medium: row.medium,
        high: row.high,
        critical: row.critical
      })),
    [report]
  )

  const tablePagination = useMemo((): TablePaginationConfig => {
    const total =
      tab === 'vulnerabilities'
        ? (report?.vulnerabilities.length ?? 0)
        : tab === 'entryPoints'
          ? (report?.entryPoints.length ?? 0)
          : (report?.vectors.length ?? 0)
    return {
      ...embeddedTablePagination(pagination, total),
      onChange: (page, pageSize) => setPagination(readPaginationChange({ current: page, pageSize })),
      onShowSizeChange: (_page, pageSize) =>
        setPagination(readPaginationChange({ current: 1, pageSize }))
    }
  }, [pagination, report, tab])

  const vulnColumns: ColumnsType<SecurityVulnerability> = useMemo(
    () => [
      {
        title: t('security.colSeverity'),
        dataIndex: 'severity',
        key: 'severity',
        width: 100,
        render: (sev: SecuritySeverity) => (
          <span className={`ml-security-sev is-${sev.toLowerCase()}`}>{sev}</span>
        )
      },
      {
        title: t('security.colWorkload'),
        dataIndex: 'workload',
        key: 'workload',
        width: 160,
        ellipsis: true
      },
      { title: t('security.colTitle'), dataIndex: 'title', key: 'title', width: 200, ellipsis: true },
      {
        title: t('security.colNamespace'),
        dataIndex: 'namespace',
        key: 'namespace',
        width: 120,
        ellipsis: true
      },
      { title: t('security.colRule'), dataIndex: 'rule', key: 'rule', width: 110 },
      { title: t('security.colSource'), dataIndex: 'source', key: 'source', width: 130 },
      { title: t('security.colPolicy'), dataIndex: 'policy', key: 'policy', width: 110 },
      {
        title: t('security.colDescription'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true
      },
      {
        title: t('security.colRecommendation'),
        dataIndex: 'recommendation',
        key: 'recommendation',
        ellipsis: true
      }
    ],
    [t]
  )

  const entryColumns: ColumnsType<SecurityEntryPoint> = useMemo(
    () => [
      { title: t('security.colName'), dataIndex: 'name', key: 'name', width: 180, ellipsis: true },
      { title: t('security.colNamespace'), dataIndex: 'namespace', key: 'namespace', width: 140 },
      {
        title: t('security.colType'),
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (type: string) => <Tag>{type}</Tag>
      },
      { title: t('security.colPorts'), dataIndex: 'ports', key: 'ports', ellipsis: true },
      {
        title: t('security.colStatus'),
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => (
          <Tag color={status === 'Active' ? 'success' : 'warning'}>{status}</Tag>
        )
      },
      {
        title: t('security.colAge'),
        dataIndex: 'age',
        key: 'age',
        width: 160,
        render: (age: string | null) => (age ? formatScanTime(age, i18n.language) : '—')
      }
    ],
    [t, i18n.language]
  )

  const vectorColumns: ColumnsType<SecurityVector> = useMemo(
    () => [
      { title: t('security.colFrom'), dataIndex: 'from', key: 'from', width: 160 },
      { title: t('security.colFromDetail'), dataIndex: 'fromDetail', key: 'fromDetail', width: 160 },
      { title: t('security.colTo'), dataIndex: 'to', key: 'to', width: 160 },
      { title: t('security.colToDetail'), dataIndex: 'toDetail', key: 'toDetail', width: 160 },
      { title: t('security.colNamespace'), dataIndex: 'namespace', key: 'namespace', width: 140 }
    ],
    [t]
  )

  function exportJson(): void {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `magiclens-security-${clusterId}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    void message.success(t('security.exportDone'))
  }

  if (loading && !report) {
    return (
      <div className="ml-security ml-security--loading">
        <SecurityScanLoader label={t('security.scanning')} />
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="ml-security ml-security--centered">
        <Empty description={error}>
          <Button type="primary" onClick={() => void load(true)}>
            {t('security.scan')}
          </Button>
        </Empty>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="ml-security ml-security--centered">
        <Empty description={t('security.empty')} />
      </div>
    )
  }

  const tone = riskTone(report.riskLabel)

  return (
    <div className="ml-security">
      <header className="ml-security__header">
        <div className="ml-security__title-wrap">
          <span className="ml-security__mark">
            <Icon icon={ShieldAlert} variant="toolbar" />
          </span>
          <div>
            <p className="ml-security__eyebrow">{t('security.eyebrow', { defaultValue: 'Cluster' })}</p>
            <h1 className="ml-security__title">{t('security.title')}</h1>
          </div>
        </div>
      </header>

      <div className="ml-security__cards">
        <section className={`ml-security-card ml-security-card--score is-${tone}`}>
          <h2 className="ml-security-card__title">{t('security.score')}</h2>
          <div className="ml-security-score">
            <i className="ml-security-score__dot" />
            <span className="ml-security-score__label">
              {t(`security.risk.${tone}`, { defaultValue: report.riskLabel })} ({report.score})
            </span>
          </div>
          <div className="ml-security-flags">
            {report.flags.length === 0 ? (
              <span className="ml-security-flags__empty">{t('security.noFlags')}</span>
            ) : (
              report.flags.map((flag) => (
                <span key={flag.id} className="ml-security-flag">
                  {flag.label}
                </span>
              ))
            )}
          </div>
        </section>

        <section className="ml-security-card">
          <h2 className="ml-security-card__title">{t('security.typeChart')}</h2>
          <div className="ml-security-chart">
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={typeData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke={chartInk} />
                <PolarAngleAxis dataKey="axis" tick={{ fill: chartTick, fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar
                  dataKey="count"
                  stroke="var(--ml-warning)"
                  fill="var(--ml-warning)"
                  fillOpacity={0.28}
                />
                <RechartsTooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="ml-security-card">
          <h2 className="ml-security-card__title">{t('security.severityChart')}</h2>
          <div className="ml-security-chart">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={severityData} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartInk} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: chartTick, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="level"
                  width={64}
                  tick={{ fill: chartTick, fontSize: 11 }}
                />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[0, 0, 0, 0]}>
                  {severityData.map((row) => (
                    <Cell key={row.level} fill={row.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="ml-security-card">
          <h2 className="ml-security-card__title">{t('security.namespaceChart')}</h2>
          <div className="ml-security-chart">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={nsData} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartInk} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: chartTick, fontSize: 11 }} />
                <YAxis type="category" dataKey="ns" width={88} tick={{ fill: chartTick, fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { full?: string } | undefined
                    return row?.full ?? ''
                  }}
                />
                <Bar dataKey="medium" stackId="a" fill={SEVERITY_COLOR.Medium} />
                <Bar dataKey="high" stackId="a" fill={SEVERITY_COLOR.High} />
                <Bar
                  dataKey="critical"
                  stackId="a"
                  fill={SEVERITY_COLOR.Critical}
                  radius={[0, 0, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="ml-security__detail">
        <div className="ml-security__detail-bar">
          <Tabs
            activeKey={tab}
            onChange={(key) => setTab(key as DetailTab)}
            items={[
              {
                key: 'vulnerabilities',
                label: `${t('security.tabVulns')} (${report.vulnerabilities.length})`
              },
              {
                key: 'entryPoints',
                label: `${t('security.tabEntry')} (${report.entryPoints.length})`
              },
              {
                key: 'vectors',
                label: `${t('security.tabVectors')} (${report.vectors.length})`
              }
            ]}
            className="ml-security__tabs"
          />
          <div className="ml-security__actions">
            <Tooltip title={t('security.lastScan')}>
              <span className="ml-security__scanned">
                {t('security.lastScan')}: {formatScanTime(report.scannedAt, i18n.language)}
              </span>
            </Tooltip>
            <Button icon={<Icon icon={Download} variant="micro" />} onClick={exportJson}>
              {t('security.export')}
            </Button>
            <Button
              type="primary"
              loading={scanning}
              icon={<Icon icon={RefreshCw} variant="micro" />}
              onClick={() => void load(true)}
            >
              {t('security.scan')}
            </Button>
          </div>
        </div>

        {tab === 'vulnerabilities' ? (
          <Table
            size="small"
            rowKey="id"
            columns={vulnColumns}
            dataSource={report.vulnerabilities}
            pagination={tablePagination}
            scroll={{ x: 1400 }}
            className="ml-security-table"
          />
        ) : null}
        {tab === 'entryPoints' ? (
          <Table
            size="small"
            rowKey={(row) => `${row.namespace}/${row.name}`}
            columns={entryColumns}
            dataSource={report.entryPoints}
            pagination={tablePagination}
            className="ml-security-table"
          />
        ) : null}
        {tab === 'vectors' ? (
          <Table
            size="small"
            rowKey="id"
            columns={vectorColumns}
            dataSource={report.vectors}
            pagination={tablePagination}
            className="ml-security-table"
          />
        ) : null}
      </div>
    </div>
  )
}
