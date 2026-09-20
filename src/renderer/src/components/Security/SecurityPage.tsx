import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Drawer, Empty, Input, Modal, Progress, Select, Table, Tabs, Tag, Tooltip, message } from 'antd'
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
import { BookOpen, Bot, Download, History, Pencil, RefreshCw, Search, ShieldAlert, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  SecurityEntryPoint,
  SecurityHistorySummary,
  SecurityReport,
  SecurityScanPhase,
  SecurityScanProgress,
  SecuritySeverity,
  SecuritySource,
  SecurityVector,
  SecurityVulnerability
} from '@shared/types/security'
import {
  searchSecurityRuleBook,
  securityRuleById,
  type SecurityRuleBookEntry
} from '@shared/securityCatalog'
import { Icon } from '../ui/Icon'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { useClusterStore } from '../../stores/clusterStore'
import { useAiAgentStore } from '../../stores/aiAgentStore'
import { useSecurityStore } from '../../stores/securityStore'
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

type DetailTab = 'vulnerabilities' | 'entryPoints' | 'vectors' | 'book'

const LIVE_WORKSPACE_ID = 'live'

interface SecurityWorkspaceTab {
  id: string
  name: string
  historyId: string | null
  report: SecurityReport
}

const SCAN_PHASES: SecurityScanPhase[] = [
  'starting',
  'fetch-pods',
  'fetch-services',
  'fetch-network',
  'fetch-rbac',
  'analyze-pods',
  'analyze-services',
  'analyze-network',
  'analyze-rbac',
  'analyze-vectors',
  'summarize',
  'done'
]

const SEVERITY_COLOR: Record<SecuritySeverity, string> = {
  Critical: '#d94c4c',
  High: '#e07a3a',
  Medium: '#e3b341',
  Low: '#94a3b8'
}

const ALL_SEVERITIES: SecuritySeverity[] = ['Critical', 'High', 'Medium', 'Low']
const ALL_SOURCES: SecuritySource[] = [
  'securityContext',
  'rbac',
  'podSpec',
  'volumes',
  'service',
  'network'
]

const SECURITY_INTRO_SEEN_KEY = 'magiclens-security-intro-seen'

function hasSeenSecurityIntro(): boolean {
  try {
    return localStorage.getItem(SECURITY_INTRO_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markSecurityIntroSeen(): void {
  try {
    localStorage.setItem(SECURITY_INTRO_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
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

function matchesText(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function SecurityScanLoader({
  progress,
  phaseLabel
}: {
  progress: SecurityScanProgress | null
  phaseLabel: string
}): React.JSX.Element {
  const { t } = useTranslation()
  const percent = progress?.percent ?? 8
  const findings = progress?.findingsCount ?? 0
  const sev = progress?.severity ?? { critical: 0, high: 0, medium: 0, low: 0 }
  const activeIdx = progress ? SCAN_PHASES.indexOf(progress.phase) : 0

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
      <p className="ml-security-loader__label">{phaseLabel}</p>
      {progress?.detail ? <p className="ml-security-loader__detail">{progress.detail}</p> : null}
      <div className="ml-security-loader__progress">
        <Progress percent={percent} showInfo size="small" status="active" />
      </div>
      <div className="ml-security-loader__stats">
        <div className="ml-security-loader__stat">
          <span className="ml-security-loader__stat-value">{findings}</span>
          <span className="ml-security-loader__stat-label">{t('security.progressFindings')}</span>
        </div>
        <div className="ml-security-loader__sev">
          <span className="ml-security-sev is-critical">{sev.critical}</span>
          <span className="ml-security-sev is-high">{sev.high}</span>
          <span className="ml-security-sev is-medium">{sev.medium}</span>
          <span className="ml-security-sev is-low">{sev.low}</span>
        </div>
      </div>
      <ul className="ml-security-loader__phases">
        {SCAN_PHASES.filter((p) => p !== 'done').map((phase, idx) => {
          const done = idx < activeIdx
          const active = idx === activeIdx
          return (
            <li
              key={phase}
              className={`ml-security-loader__phase${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
            >
              {t(`security.phase.${phase}`, { defaultValue: phase })}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function SecurityPage({ clusterId }: SecurityPageProps): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const isDark = useResolvedDarkMode()
  const setReportInStore = useSecurityStore((s) => s.setReport)
  const focusFindingId = useSecurityStore((s) => s.focusFindingId)
  const focusRuleId = useSecurityStore((s) => s.focusRuleId)
  const clearFocus = useSecurityStore((s) => s.clearFocus)
  const cluster = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId))
  const setPanelOpen = useAiAgentStore((s) => s.setPanelOpen)
  const sendUserMessage = useAiAgentStore((s) => s.sendUserMessage)

  const [report, setReport] = useState<SecurityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<SecurityScanProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [introOpen, setIntroOpen] = useState(false)
  const [history, setHistory] = useState<SecurityHistorySummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<SecurityHistorySummary | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [workspaceTabs, setWorkspaceTabs] = useState<SecurityWorkspaceTab[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(LIVE_WORKSPACE_ID)
  const [tab, setTab] = useState<DetailTab>('vulnerabilities')
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SecuritySeverity[]>([])
  const [sourceFilter, setSourceFilter] = useState<SecuritySource[]>([])
  const [namespaceFilter, setNamespaceFilter] = useState<string | null>(null)
  const [selectedVuln, setSelectedVuln] = useState<SecurityVulnerability | null>(null)
  const [selectedRule, setSelectedRule] = useState<SecurityRuleBookEntry | null>(null)
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

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await window.api.security.listHistory({ clusterId })
      if ('error' in res) {
        setHistory([])
      } else {
        setHistory(res.items)
      }
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [clusterId])

  const applyLiveReport = useCallback((next: SecurityReport, name?: string) => {
    setReport(next)
    setReportInStore(clusterId, next)
    setWorkspaceTabs((prev) => {
      const liveName = name?.trim() || t('security.liveTab')
      const withoutLive = prev.filter((w) => w.id !== LIVE_WORKSPACE_ID)
      return [
        { id: LIVE_WORKSPACE_ID, name: liveName, historyId: null, report: next },
        ...withoutLive
      ]
    })
    setActiveWorkspaceId(LIVE_WORKSPACE_ID)
  }, [clusterId, setReportInStore, t])

  const openWorkspaceTab = useCallback(
    (entry: SecurityWorkspaceTab) => {
      setWorkspaceTabs((prev) => {
        const existing = prev.find((w) => w.id === entry.id)
        if (existing) {
          return prev.map((w) => (w.id === entry.id ? { ...entry } : w))
        }
        return [...prev, entry]
      })
      setActiveWorkspaceId(entry.id)
      setReport(entry.report)
      if (entry.historyId == null) {
        setReportInStore(clusterId, entry.report)
      }
      setTab('vulnerabilities')
      setSelectedVuln(null)
      setSelectedRule(null)
    },
    [clusterId, setReportInStore]
  )

  const closeWorkspaceTab = useCallback(
    (id: string) => {
      setWorkspaceTabs((prev) => {
        const next = prev.filter((w) => w.id !== id)
        setActiveWorkspaceId((active) => {
          if (active !== id) return active
          const fallback = next.find((w) => w.id === LIVE_WORKSPACE_ID) ?? next[0] ?? null
          if (fallback) {
            setReport(fallback.report)
            if (fallback.historyId == null) setReportInStore(clusterId, fallback.report)
          } else {
            setReport(null)
          }
          return fallback?.id ?? LIVE_WORKSPACE_ID
        })
        return next
      })
    },
    [clusterId, setReportInStore]
  )

  const load = useCallback(
    async (manual = false) => {
      if (manual) setScanning(true)
      else setLoading(true)
      setError(null)
      setScanProgress({
        clusterId,
        phase: 'starting',
        percent: 2,
        findingsCount: 0,
        severity: { critical: 0, high: 0, medium: 0, low: 0 }
      })
      setActiveWorkspaceId(LIVE_WORKSPACE_ID)
      const unsub = window.api.security.onScanProgress((p) => {
        if (p.clusterId === clusterId) setScanProgress(p)
      })
      const started = Date.now()
      try {
        const res = await window.api.security.scan({ clusterId })
        if (!manual) {
          const wait = INITIAL_SCAN_MIN_MS - (Date.now() - started)
          if (wait > 0) await new Promise((r) => setTimeout(r, wait))
        }
        if ('error' in res) {
          setError(res.error)
          if (!manual) setReport(null)
        } else {
          applyLiveReport(res)
          void refreshHistory()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        if (!manual) setReport(null)
      } finally {
        unsub()
        setScanProgress(null)
        setLoading(false)
        setScanning(false)
      }
    },
    [clusterId, applyLiveReport, refreshHistory]
  )

  const requestScan = useCallback(
    (manual = false) => {
      if (!hasSeenSecurityIntro()) {
        setLoading(false)
        setScanning(false)
        setIntroOpen(true)
        return
      }
      void load(manual)
    },
    [load]
  )

  const confirmIntroScan = useCallback(() => {
    markSecurityIntroSeen()
    setIntroOpen(false)
    void load(true)
  }, [load])

  const dismissIntro = useCallback(() => {
    markSecurityIntroSeen()
    setIntroOpen(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    setReport(null)
    setError(null)
    setSearch('')
    setSeverityFilter([])
    setSourceFilter([])
    setNamespaceFilter(null)
    setPagination({ current: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE })
    setIntroOpen(false)
    setWorkspaceTabs([])
    setActiveWorkspaceId(LIVE_WORKSPACE_ID)
    setHistory([])
    setHistoryOpen(false)
    setLoading(true)

    void (async () => {
      await refreshHistory()
      if (cancelled) return

      const cached = useSecurityStore.getState().getReport(clusterId)
      if (cached) {
        applyLiveReport(cached)
        setLoading(false)
        return
      }

      try {
        const listed = await window.api.security.listHistory({ clusterId })
        if (cancelled) return
        if (!('error' in listed) && listed.items.length > 0) {
          const latest = listed.items[0]
          const full = await window.api.security.getHistory({ clusterId, id: latest.id })
          if (cancelled) return
          if (!('error' in full)) {
            applyLiveReport(full.report, t('security.liveTab'))
            setLoading(false)
            return
          }
        }
      } catch {
        /* fall through to idle empty state */
      }

      if (cancelled) return
      setLoading(false)
      if (!hasSeenSecurityIntro()) setIntroOpen(true)
    })()

    return () => {
      cancelled = true
    }
  }, [clusterId, refreshHistory, applyLiveReport, t])

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }))
  }, [tab, search, severityFilter, sourceFilter, namespaceFilter, activeWorkspaceId, report?.scannedAt])

  useEffect(() => {
    if (!report || !focusFindingId) return
    const found = report.vulnerabilities.find((v) => v.id === focusFindingId)
    if (found) {
      setTab('vulnerabilities')
      setSelectedVuln(found)
      setSelectedRule(null)
    }
    clearFocus()
  }, [report, focusFindingId, clearFocus])

  useEffect(() => {
    if (!focusRuleId) return
    const rule = securityRuleById(focusRuleId)
    if (rule) {
      setTab('book')
      setSelectedRule(rule)
      setSelectedVuln(null)
    }
    clearFocus()
  }, [focusRuleId, clearFocus])

  const namespaces = useMemo(() => {
    const set = new Set<string>()
    for (const v of report?.vulnerabilities ?? []) set.add(v.namespace)
    for (const e of report?.entryPoints ?? []) set.add(e.namespace)
    return [...set].sort()
  }, [report])

  const filteredVulns = useMemo(() => {
    const rows = report?.vulnerabilities ?? []
    return rows.filter((v) => {
      if (severityFilter.length && !severityFilter.includes(v.severity)) return false
      if (sourceFilter.length && !sourceFilter.includes(v.source)) return false
      if (namespaceFilter && v.namespace !== namespaceFilter) return false
      const hay = [
        v.id,
        v.title,
        v.workload,
        v.namespace,
        v.rule,
        v.source,
        v.policy,
        v.description,
        v.recommendation,
        v.exploitation
      ].join(' ')
      return matchesText(hay, search)
    })
  }, [report, severityFilter, sourceFilter, namespaceFilter, search])

  const filteredEntries = useMemo(() => {
    const rows = report?.entryPoints ?? []
    return rows.filter((e) => {
      if (namespaceFilter && e.namespace !== namespaceFilter) return false
      const hay = [e.name, e.namespace, e.type, e.ports, e.status, e.clusterIP ?? '', e.externalIPs ?? ''].join(
        ' '
      )
      return matchesText(hay, search)
    })
  }, [report, namespaceFilter, search])

  const filteredVectors = useMemo(() => {
    const rows = report?.vectors ?? []
    return rows.filter((v) => {
      if (namespaceFilter && v.namespace !== namespaceFilter) return false
      const hay = [v.from, v.fromDetail, v.to, v.toDetail, v.namespace].join(' ')
      return matchesText(hay, search)
    })
  }, [report, namespaceFilter, search])

  const filteredBook = useMemo(() => searchSecurityRuleBook(search), [search])

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

  const tableTotal =
    tab === 'vulnerabilities'
      ? filteredVulns.length
      : tab === 'entryPoints'
        ? filteredEntries.length
        : tab === 'vectors'
          ? filteredVectors.length
          : filteredBook.length

  const tablePagination = useMemo((): TablePaginationConfig => {
    const total = tableTotal
    const maxPage = Math.max(1, Math.ceil(total / Math.max(pagination.pageSize, 1)) || 1)
    const current = Math.min(Math.max(pagination.current, 1), maxPage)
    return {
      ...embeddedTablePagination({ current, pageSize: pagination.pageSize }, total),
      current,
      total,
      hideOnSinglePage: false,
      showSizeChanger: true,
      position: ['bottomRight'],
      onChange: (page, pageSize) => setPagination(readPaginationChange({ current: page, pageSize })),
      onShowSizeChange: (_page, pageSize) =>
        setPagination(readPaginationChange({ current: 1, pageSize }))
    }
  }, [pagination, tableTotal])

  const vulnColumns: ColumnsType<SecurityVulnerability> = useMemo(
    () => [
      {
        title: t('security.colSeverity'),
        dataIndex: 'severity',
        key: 'severity',
        width: 88,
        sorter: (a, b) => ALL_SEVERITIES.indexOf(a.severity) - ALL_SEVERITIES.indexOf(b.severity),
        render: (sev: SecuritySeverity) => (
          <span className={`ml-security-sev is-${sev.toLowerCase()}`}>{sev}</span>
        )
      },
      {
        title: t('security.colWorkload'),
        dataIndex: 'workload',
        key: 'workload',
        width: 140,
        ellipsis: true,
        sorter: (a, b) => a.workload.localeCompare(b.workload)
      },
      {
        title: t('security.colTitle'),
        dataIndex: 'title',
        key: 'title',
        ellipsis: true
      },
      {
        title: t('security.colNamespace'),
        dataIndex: 'namespace',
        key: 'namespace',
        width: 110,
        ellipsis: true,
        sorter: (a, b) => a.namespace.localeCompare(b.namespace)
      },
      {
        title: t('security.colRule'),
        dataIndex: 'rule',
        key: 'rule',
        width: 100,
        ellipsis: true,
        render: (rule: string) => <code className="ml-security-rule">{rule}</code>
      },
      {
        title: t('security.colSource'),
        dataIndex: 'source',
        key: 'source',
        width: 110,
        ellipsis: true
      }
    ],
    [t]
  )

  const entryColumns: ColumnsType<SecurityEntryPoint> = useMemo(
    () => [
      { title: t('security.colName'), dataIndex: 'name', key: 'name', ellipsis: true },
      {
        title: t('security.colNamespace'),
        dataIndex: 'namespace',
        key: 'namespace',
        width: 120,
        ellipsis: true
      },
      {
        title: t('security.colType'),
        dataIndex: 'type',
        key: 'type',
        width: 100,
        render: (type: string) => <Tag>{type}</Tag>
      },
      { title: t('security.colPorts'), dataIndex: 'ports', key: 'ports', width: 140, ellipsis: true },
      {
        title: t('security.colStatus'),
        dataIndex: 'status',
        key: 'status',
        width: 90,
        render: (status: string) => (
          <Tag color={status === 'Active' ? 'success' : 'warning'}>{status}</Tag>
        )
      }
    ],
    [t]
  )

  const vectorColumns: ColumnsType<SecurityVector> = useMemo(
    () => [
      { title: t('security.colFrom'), dataIndex: 'from', key: 'from', width: 130, ellipsis: true },
      {
        title: t('security.colFromDetail'),
        dataIndex: 'fromDetail',
        key: 'fromDetail',
        ellipsis: true
      },
      { title: t('security.colTo'), dataIndex: 'to', key: 'to', width: 130, ellipsis: true },
      {
        title: t('security.colToDetail'),
        dataIndex: 'toDetail',
        key: 'toDetail',
        ellipsis: true
      },
      {
        title: t('security.colNamespace'),
        dataIndex: 'namespace',
        key: 'namespace',
        width: 110,
        ellipsis: true
      }
    ],
    [t]
  )

  const bookColumns: ColumnsType<SecurityRuleBookEntry> = useMemo(
    () => [
      {
        title: t('security.colRule'),
        dataIndex: 'id',
        key: 'id',
        width: 110,
        render: (id: string) => <code className="ml-security-rule">{id}</code>
      },
      {
        title: t('security.colSeverity'),
        dataIndex: 'severity',
        key: 'severity',
        width: 88,
        render: (sev: SecuritySeverity) => (
          <span className={`ml-security-sev is-${sev.toLowerCase()}`}>{sev}</span>
        )
      },
      { title: t('security.colTitle'), dataIndex: 'title', key: 'title', width: 180, ellipsis: true },
      {
        title: t('security.colSource'),
        dataIndex: 'source',
        key: 'source',
        width: 110,
        ellipsis: true
      },
      { title: t('security.bookSummary'), dataIndex: 'summary', key: 'summary', ellipsis: true }
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

  function askCopilotAboutFinding(v: SecurityVulnerability): void {
    setPanelOpen(true)
    const prompt = [
      `Explain this Kubernetes security finding and how to fix it in my cluster.`,
      ``,
      `Rule: ${v.rule}`,
      `Title: ${v.title}`,
      `Severity: ${v.severity}`,
      `Workload: ${v.kind}/${v.workload} (namespace ${v.namespace})`,
      `Description: ${v.description}`,
      `Recommendation: ${v.recommendation}`,
      `Exploitation: ${v.exploitation}`,
      ``,
      `Give concrete YAML patches and verification steps.`
    ].join('\n')
    void sendUserMessage(prompt, {
      clusterId,
      clusterName: cluster?.customName || cluster?.contextName || clusterId,
      namespace: v.namespace,
      kind: v.kind,
      virtualPage: 'security',
      resourceName: v.workload
    })
  }

  function askCopilotAboutRule(rule: SecurityRuleBookEntry): void {
    setPanelOpen(true)
    const prompt = [
      `Explain MagicLens security rule ${rule.id} (${rule.title}) for Kubernetes.`,
      ``,
      `Summary: ${rule.summary}`,
      `What it checks: ${rule.what}`,
      `Why it matters: ${rule.why}`,
      `Suggested fix: ${rule.fix}`,
      `Exploit path: ${rule.exploit}`,
      ``,
      `Show a before/after YAML example and how to verify with kubectl.`
    ].join('\n')
    void sendUserMessage(prompt, {
      clusterId,
      clusterName: cluster?.customName || cluster?.contextName || clusterId,
      namespace: cluster?.selectedNamespace || 'ALL',
      kind: null,
      virtualPage: 'security',
      resourceName: rule.id
    })
  }

  const drawerOpen = selectedVuln != null || selectedRule != null
  const drawerRule =
    selectedRule ?? (selectedVuln ? securityRuleById(selectedVuln.rule) ?? null : null)

  async function openHistoryRecord(id: string): Promise<void> {
    const existing = workspaceTabs.find((w) => w.id === id)
    if (existing) {
      openWorkspaceTab(existing)
      setHistoryOpen(false)
      return
    }
    const res = await window.api.security.getHistory({ clusterId, id })
    if ('error' in res) {
      void message.error(res.error)
      return
    }
    openWorkspaceTab({
      id: res.id,
      name: res.name || t('security.historyUntitled'),
      historyId: res.id,
      report: res.report
    })
    setHistoryOpen(false)
  }

  async function downloadHistoryRecord(row: SecurityHistorySummary): Promise<void> {
    const res = await window.api.security.getHistory({ clusterId, id: row.id })
    if ('error' in res) {
      void message.error(res.error)
      return
    }
    const safeName = (row.name || 'scan')
      .replace(/[^\w\-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 48)
    const blob = new Blob([JSON.stringify(res.report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `magiclens-security-${safeName || row.id}.json`
    a.click()
    URL.revokeObjectURL(url)
    void message.success(t('security.exportDone'))
  }

  async function submitRename(): Promise<void> {
    if (!renameTarget) return
    const next = renameValue.trim()
    if (!next) {
      void message.warning(t('security.historyNameRequired'))
      return
    }
    setRenaming(true)
    try {
      const res = await window.api.security.renameHistory({
        clusterId,
        id: renameTarget.id,
        name: next
      })
      if ('error' in res) {
        void message.error(res.error)
        return
      }
      setWorkspaceTabs((prev) =>
        prev.map((w) => (w.id === renameTarget.id ? { ...w, name: res.name } : w))
      )
      setRenameTarget(null)
      void refreshHistory()
      void message.success(t('security.historyRenamed'))
    } finally {
      setRenaming(false)
    }
  }

  async function removeHistoryRecord(id: string): Promise<void> {
    const res = await window.api.security.deleteHistory({ clusterId, id })
    if ('error' in res) {
      void message.error(res.error)
      return
    }
    if (workspaceTabs.some((w) => w.id === id)) closeWorkspaceTab(id)
    void refreshHistory()
  }

  async function clearAllHistory(): Promise<void> {
    const res = await window.api.security.clearHistory({ clusterId })
    if ('error' in res) {
      void message.error(res.error)
      return
    }
    setWorkspaceTabs((prev) => prev.filter((w) => w.historyId == null))
    setActiveWorkspaceId(LIVE_WORKSPACE_ID)
    void refreshHistory()
    void message.success(t('security.historyCleared'))
  }

  const viewingHistoryId =
    workspaceTabs.find((w) => w.id === activeWorkspaceId)?.historyId ?? null
  const openWorkspaceIds = useMemo(
    () => new Set(workspaceTabs.filter((w) => w.historyId).map((w) => w.id)),
    [workspaceTabs]
  )

  const historyCompare =
    report && history.length
      ? history.find((h) => h.scannedAt !== report.scannedAt) ?? null
      : null
  const findingDelta =
    report && historyCompare ? report.vulnerabilities.length - historyCompare.findingCount : null

  const phaseLabel = scanProgress
    ? t(`security.phase.${scanProgress.phase}`, { defaultValue: t('security.scanning') })
    : t('security.scanning')

  const introModal = (
    <Modal
      open={introOpen}
      title={
        <span className="ml-security-intro__title">
          <Icon icon={ShieldAlert} variant="toolbar" />
          {t('security.introTitle')}
        </span>
      }
      onCancel={dismissIntro}
      footer={[
        <Button key="later" onClick={dismissIntro}>
          {t('security.introLater')}
        </Button>,
        <Button key="scan" type="primary" icon={<Icon icon={RefreshCw} variant="micro" />} onClick={confirmIntroScan}>
          {t('security.scan')}
        </Button>
      ]}
      width={520}
      centered
      destroyOnHidden
      className="ml-security-intro"
    >
      <p className="ml-security-intro__lead">{t('security.introLead')}</p>
      <p className="ml-security-intro__body">{t('security.introBody')}</p>
      <ul className="ml-security-intro__list">
        <li>{t('security.introItemContext')}</li>
        <li>{t('security.introItemRbac')}</li>
        <li>{t('security.introItemNetwork')}</li>
        <li>{t('security.introItemVolumes')}</li>
        <li>{t('security.introItemServices')}</li>
      </ul>
      <p className="ml-security-intro__note">{t('security.introNote')}</p>
    </Modal>
  )

  if (scanning && !report) {
    return (
      <div className="ml-security ml-security--loading">
        <SecurityScanLoader progress={scanProgress} phaseLabel={phaseLabel} />
      </div>
    )
  }

  if (loading && !report) {
    return <div className="ml-security ml-security--loading" />
  }

  if (error && !report) {
    return (
      <div className="ml-security ml-security--centered">
        {introModal}
        <Empty description={error}>
          <Button type="primary" onClick={() => requestScan(true)}>
            {t('security.scan')}
          </Button>
        </Empty>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="ml-security ml-security--centered">
        {introModal}
        <Empty
          image={<Icon icon={ShieldAlert} size={48} strokeWidth={1.4} />}
          description={
            <div className="ml-security-empty">
              <strong>{t('security.idleTitle')}</strong>
              <p>{t('security.idleHint')}</p>
            </div>
          }
        >
          <Button type="primary" icon={<Icon icon={RefreshCw} variant="micro" />} onClick={() => requestScan(true)}>
            {t('security.scan')}
          </Button>
        </Empty>
      </div>
    )
  }

  const tone = riskTone(report.riskLabel)

  return (
    <div className="ml-security">
      {introModal}
      {scanning ? (
        <div className="ml-security-scan-overlay">
          <SecurityScanLoader progress={scanProgress} phaseLabel={phaseLabel} />
        </div>
      ) : null}
      <header className="ml-security__header">
        <div className="ml-security__title-wrap">
          <span className="ml-security__mark">
            <Icon icon={ShieldAlert} variant="toolbar" />
          </span>
          <div>
            <p className="ml-security__eyebrow">{t('security.eyebrow')}</p>
            <h1 className="ml-security__title">{t('security.title')}</h1>
          </div>
        </div>
        {findingDelta != null && historyCompare ? (
          <div
            className={`ml-security__delta${findingDelta < 0 ? ' is-better' : findingDelta > 0 ? ' is-worse' : ''}`}
          >
            <span>
              {t('security.compareFindings', {
                previous: historyCompare.findingCount,
                current: report.vulnerabilities.length
              })}
            </span>
            <span className="ml-security__delta-badge">
              {findingDelta === 0
                ? t('security.compareSame')
                : findingDelta < 0
                  ? t('security.compareDown', { count: Math.abs(findingDelta) })
                  : t('security.compareUp', { count: findingDelta })}
            </span>
          </div>
        ) : null}
      </header>

      {workspaceTabs.length > 0 ? (
        <div className="ml-security-workspace" role="tablist" aria-label={t('security.workspaceTabs')}>
          {workspaceTabs.map((w) => {
            const active = w.id === activeWorkspaceId
            return (
              <div
                key={w.id}
                className={`ml-security-workspace__tab${active ? ' is-active' : ''}${w.historyId ? ' is-saved' : ''}`}
                role="tab"
                aria-selected={active}
                tabIndex={0}
                onClick={() => openWorkspaceTab(w)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openWorkspaceTab(w)
                  }
                }}
              >
                {w.historyId ? <Icon icon={History} variant="micro" /> : <Icon icon={ShieldAlert} variant="micro" />}
                <span className="ml-security-workspace__tab-label" title={w.name}>
                  {w.name}
                </span>
                {w.historyId || workspaceTabs.length > 1 ? (
                  <button
                    type="button"
                    className="ml-security-workspace__tab-close"
                    aria-label={t('security.closeTab')}
                    onClick={(e) => {
                      e.stopPropagation()
                      closeWorkspaceTab(w.id)
                    }}
                  >
                    <Icon icon={X} variant="micro" />
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

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
            <ResponsiveContainer width="100%" height={120}>
              <RadarChart data={typeData} cx="50%" cy="50%" outerRadius="68%">
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
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={severityData} layout="vertical" margin={{ left: 4, right: 8, top: 2, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartInk} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: chartTick, fontSize: 10 }} />
                <YAxis type="category" dataKey="level" width={56} tick={{ fill: chartTick, fontSize: 10 }} />
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
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={nsData} layout="vertical" margin={{ left: 4, right: 8, top: 2, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartInk} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: chartTick, fontSize: 10 }} />
                <YAxis type="category" dataKey="ns" width={72} tick={{ fill: chartTick, fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { full?: string } | undefined
                    return row?.full ?? ''
                  }}
                />
                <Bar dataKey="medium" stackId="a" fill={SEVERITY_COLOR.Medium} />
                <Bar dataKey="high" stackId="a" fill={SEVERITY_COLOR.High} />
                <Bar dataKey="critical" stackId="a" fill={SEVERITY_COLOR.Critical} />
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
                label: `${t('security.tabVulns')} (${filteredVulns.length})`
              },
              {
                key: 'entryPoints',
                label: `${t('security.tabEntry')} (${filteredEntries.length})`
              },
              {
                key: 'vectors',
                label: `${t('security.tabVectors')} (${filteredVectors.length})`
              },
              {
                key: 'book',
                label: (
                  <span className="ml-security__tab-with-icon">
                    <Icon icon={BookOpen} variant="micro" />
                    {t('security.tabBook')} ({filteredBook.length})
                  </span>
                )
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
            <Button
              icon={<Icon icon={History} variant="micro" />}
              onClick={() => {
                void refreshHistory()
                setHistoryOpen(true)
              }}
            >
              {t('security.tabHistory')}
              {history.length ? ` (${history.length})` : ''}
            </Button>
            <Button icon={<Icon icon={Download} variant="micro" />} onClick={exportJson}>
              {t('security.export')}
            </Button>
            <Button
              type="primary"
              loading={scanning}
              icon={<Icon icon={RefreshCw} variant="micro" />}
              onClick={() => requestScan(true)}
            >
              {t('security.scan')}
            </Button>
          </div>
        </div>

        <div className="ml-security__filters">
          <Input
            allowClear
            size="small"
            prefix={<Icon icon={Search} variant="micro" />}
            placeholder={t('security.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-security__search"
          />
          {tab === 'vulnerabilities' || tab === 'book' ? (
            <Select
              mode="multiple"
              allowClear
              size="small"
              placeholder={t('security.filterSeverity')}
              value={severityFilter}
              onChange={setSeverityFilter}
              options={ALL_SEVERITIES.map((s) => ({ value: s, label: s }))}
              className="ml-security__filter-select"
              maxTagCount="responsive"
            />
          ) : null}
          {tab === 'vulnerabilities' || tab === 'book' ? (
            <Select
              mode="multiple"
              allowClear
              size="small"
              placeholder={t('security.filterSource')}
              value={sourceFilter}
              onChange={setSourceFilter}
              options={ALL_SOURCES.map((s) => ({ value: s, label: s }))}
              className="ml-security__filter-select"
              maxTagCount="responsive"
            />
          ) : null}
          {tab !== 'book' ? (
            <Select
              allowClear
              size="small"
              placeholder={t('security.filterNamespace')}
              value={namespaceFilter}
              onChange={(v) => setNamespaceFilter(v ?? null)}
              options={namespaces.map((ns) => ({ value: ns, label: ns }))}
              className="ml-security__filter-select"
              showSearch
            />
          ) : null}
          {(search || severityFilter.length || sourceFilter.length || namespaceFilter) && (
            <Button
              size="small"
              type="link"
              onClick={() => {
                setSearch('')
                setSeverityFilter([])
                setSourceFilter([])
                setNamespaceFilter(null)
              }}
            >
              {t('security.clearFilters')}
            </Button>
          )}
        </div>

        {tab === 'vulnerabilities' ? (
          <div className="ml-security-table-wrap">
            <Table
              size="small"
              rowKey="id"
              columns={vulnColumns}
              dataSource={filteredVulns}
              pagination={tablePagination}
              scroll={{ x: 720 }}
              className="ml-security-table"
              onRow={(record) => ({
                onClick: () => {
                  setSelectedVuln(record)
                  setSelectedRule(null)
                },
                className: 'ml-security-table__row'
              })}
              locale={{ emptyText: t('security.noFilterMatches') }}
            />
          </div>
        ) : null}
        {tab === 'entryPoints' ? (
          <div className="ml-security-table-wrap">
            <Table
              size="small"
              rowKey={(row) => `${row.namespace}/${row.name}`}
              columns={entryColumns}
              dataSource={filteredEntries}
              pagination={tablePagination}
              scroll={{ x: 640 }}
              className="ml-security-table"
              locale={{ emptyText: t('security.noFilterMatches') }}
            />
          </div>
        ) : null}
        {tab === 'vectors' ? (
          <div className="ml-security-table-wrap">
            <Table
              size="small"
              rowKey="id"
              columns={vectorColumns}
              dataSource={filteredVectors}
              pagination={tablePagination}
              scroll={{ x: 720 }}
              className="ml-security-table"
              locale={{ emptyText: t('security.noFilterMatches') }}
            />
          </div>
        ) : null}
        {tab === 'book' ? (
          <div className="ml-security-table-wrap">
            <Table
              size="small"
              rowKey="id"
              columns={bookColumns}
              dataSource={
                severityFilter.length || sourceFilter.length
                  ? filteredBook.filter(
                      (r) =>
                        (!severityFilter.length || severityFilter.includes(r.severity)) &&
                        (!sourceFilter.length || sourceFilter.includes(r.source))
                    )
                  : filteredBook
              }
              pagination={tablePagination}
              scroll={{ x: 720 }}
              className="ml-security-table"
              onRow={(record) => ({
                onClick: () => {
                  setSelectedRule(record)
                  setSelectedVuln(null)
                },
                className: 'ml-security-table__row'
              })}
              locale={{ emptyText: t('security.noFilterMatches') }}
            />
          </div>
        ) : null}
      </div>

      <Modal
        open={historyOpen}
        onCancel={() => setHistoryOpen(false)}
        title={null}
        footer={null}
        width={720}
        centered
        destroyOnHidden
        className="ml-security-history-modal"
        rootClassName="ml-security-history-modal-root"
        closable={false}
      >
        <div className="ml-security-history-shell">
          <header className="ml-security-history-shell__header">
            <div className="ml-security-history-shell__brand">
              <span className="ml-security-history-shell__mark">
                <Icon icon={History} variant="toolbar" />
              </span>
              <div className="ml-security-history-shell__titles">
                <p className="ml-security-history-shell__eyebrow">{t('security.eyebrow')}</p>
                <h2 className="ml-security-history-shell__title">{t('security.historyModalTitle')}</h2>
                <p className="ml-security-history-shell__hint">{t('security.historyHint')}</p>
              </div>
            </div>
            <div className="ml-security-history-shell__header-actions">
              {history.length > 0 ? (
                <span className="ml-security-history-shell__count">
                  {t('security.historyCount', { count: history.length })}
                </span>
              ) : null}
              <Button type="text" onClick={() => setHistoryOpen(false)}>
                {t('security.historyClose')}
              </Button>
            </div>
          </header>

          <div className="ml-security-history-shell__body">
            {historyLoading ? (
              <div className="ml-security-history-shell__empty">{t('security.scanning')}</div>
            ) : history.length === 0 ? (
              <div className="ml-security-history-shell__empty">
                <span className="ml-security-history-shell__empty-mark">
                  <Icon icon={ShieldAlert} size={28} strokeWidth={1.5} />
                </span>
                <p>{t('security.historyEmpty')}</p>
              </div>
            ) : (
              <ul className="ml-security-history-list">
                {history.map((row, index) => {
                  const prev = history[index + 1]
                  const delta = prev ? row.findingCount - prev.findingCount : null
                  const active = viewingHistoryId === row.id
                  const alreadyOpen = openWorkspaceIds.has(row.id)
                  return (
                    <li key={row.id}>
                      <div
                        className={`ml-security-history-item${active ? ' is-active' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => void openHistoryRecord(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            void openHistoryRecord(row.id)
                          }
                        }}
                      >
                        <div className="ml-security-history-item__main">
                          <div className="ml-security-history-item__name-row">
                            <span className="ml-security-history-item__name">
                              {row.name || t('security.historyUntitled')}
                            </span>
                            {alreadyOpen ? (
                              <span className="ml-security-history-item__badge">
                                {active ? t('security.historyActive') : t('security.historyLoaded')}
                              </span>
                            ) : null}
                          </div>
                          <div className="ml-security-history-item__meta">
                            <span>{formatScanTime(row.scannedAt, i18n.language)}</span>
                            <span className="ml-security-history-item__dot" />
                            <span>
                              {t('security.score')} {row.score}
                            </span>
                            <span className="ml-security-history-item__dot" />
                            <span className="ml-security-history-count">
                              {row.findingCount} {t('security.colFindings').toLowerCase()}
                              {delta != null && delta !== 0 ? (
                                <span className={delta < 0 ? 'is-better' : 'is-worse'}>
                                  {delta > 0 ? `+${delta}` : delta}
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="ml-security-history-item__sev">
                            <span className="ml-security-sev is-critical">{row.critical}</span>
                            <span className="ml-security-sev is-high">{row.high}</span>
                            <span className="ml-security-sev is-medium">{row.medium}</span>
                            <span className="ml-security-sev is-low">{row.low}</span>
                            <span className="ml-security-history-item__risk">{row.riskLabel}</span>
                          </div>
                        </div>
                        <div
                          className="ml-security-history-item__actions"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Tooltip title={t('security.historyRename')}>
                            <Button
                              size="small"
                              type="text"
                              icon={<Icon icon={Pencil} variant="micro" />}
                              onClick={() => {
                                setRenameTarget(row)
                                setRenameValue(row.name)
                              }}
                            />
                          </Tooltip>
                          <Tooltip title={t('security.historyDownload')}>
                            <Button
                              size="small"
                              type="text"
                              icon={<Icon icon={Download} variant="micro" />}
                              onClick={() => void downloadHistoryRecord(row)}
                            />
                          </Tooltip>
                          <Tooltip title={t('security.historyDelete')}>
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<Icon icon={Trash2} variant="micro" />}
                              onClick={() => void removeHistoryRecord(row.id)}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <footer className="ml-security-history-shell__footer">
            <Button
              danger
              type="text"
              disabled={!history.length}
              onClick={() => void clearAllHistory()}
            >
              {t('security.historyClear')}
            </Button>
            <Button type="primary" onClick={() => setHistoryOpen(false)}>
              {t('security.historyClose')}
            </Button>
          </footer>
        </div>
      </Modal>

      <Modal
        open={renameTarget != null}
        title={null}
        footer={null}
        onCancel={() => setRenameTarget(null)}
        destroyOnHidden
        centered
        width={420}
        className="ml-security-rename-modal"
        rootClassName="ml-security-history-modal-root"
        closable={false}
      >
        <div className="ml-security-rename-shell">
          <h3 className="ml-security-rename-shell__title">{t('security.historyRename')}</h3>
          <Input
            autoFocus
            size="large"
            value={renameValue}
            maxLength={80}
            placeholder={t('security.historyNamePlaceholder')}
            onChange={(e) => setRenameValue(e.target.value)}
            onPressEnter={() => void submitRename()}
            className="ml-security-rename-shell__input"
          />
          <div className="ml-security-rename-shell__footer">
            <Button onClick={() => setRenameTarget(null)}>{t('security.historyClose')}</Button>
            <Button type="primary" loading={renaming} onClick={() => void submitRename()}>
              {t('security.historySaveName')}
            </Button>
          </div>
        </div>
      </Modal>

      <Drawer
        open={drawerOpen}
        onClose={() => {
          setSelectedVuln(null)
          setSelectedRule(null)
        }}
        width={440}
        title={
          selectedVuln
            ? selectedVuln.title
            : selectedRule
              ? `${selectedRule.id} · ${selectedRule.title}`
              : t('security.detailTitle')
        }
        className="ml-security-drawer"
        destroyOnHidden
      >
        {selectedVuln ? (
          <div className="ml-security-detail">
            <div className="ml-security-detail__meta">
              <span className={`ml-security-sev is-${selectedVuln.severity.toLowerCase()}`}>
                {selectedVuln.severity}
              </span>
              <code className="ml-security-rule">{selectedVuln.rule}</code>
              <Tag>{selectedVuln.source}</Tag>
              <Tag>{selectedVuln.policy}</Tag>
            </div>
            <p className="ml-security-detail__line">
              <strong>{t('security.colWorkload')}:</strong> {selectedVuln.kind}/{selectedVuln.workload} ·{' '}
              {selectedVuln.namespace}
            </p>
            <h3>{t('security.colDescription')}</h3>
            <p>{selectedVuln.description}</p>
            <h3>{t('security.colRecommendation')}</h3>
            <p>{selectedVuln.recommendation}</p>
            <h3>{t('security.exploitation')}</h3>
            <p>{selectedVuln.exploitation}</p>
            {drawerRule ? (
              <>
                <h3>{t('security.bookWhy')}</h3>
                <p>{drawerRule.why}</p>
                <h3>{t('security.bookWhat')}</h3>
                <p>{drawerRule.what}</p>
              </>
            ) : null}
            <div className="ml-security-detail__actions">
              <Button
                type="primary"
                icon={<Icon icon={Bot} variant="micro" />}
                onClick={() => askCopilotAboutFinding(selectedVuln)}
              >
                {t('security.askCopilot')}
              </Button>
              {drawerRule ? (
                <Button
                  icon={<Icon icon={BookOpen} variant="micro" />}
                  onClick={() => {
                    setSelectedRule(drawerRule)
                    setSelectedVuln(null)
                    setTab('book')
                  }}
                >
                  {t('security.openInBook')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {selectedRule && !selectedVuln ? (
          <div className="ml-security-detail">
            <div className="ml-security-detail__meta">
              <span className={`ml-security-sev is-${selectedRule.severity.toLowerCase()}`}>
                {selectedRule.severity}
              </span>
              <code className="ml-security-rule">{selectedRule.id}</code>
              <Tag>{selectedRule.source}</Tag>
              <Tag>{selectedRule.policy}</Tag>
            </div>
            <p>{selectedRule.summary}</p>
            <h3>{t('security.bookWhat')}</h3>
            <p>{selectedRule.what}</p>
            <h3>{t('security.bookWhy')}</h3>
            <p>{selectedRule.why}</p>
            <h3>{t('security.bookFix')}</h3>
            <p>{selectedRule.fix}</p>
            <h3>{t('security.exploitation')}</h3>
            <p>{selectedRule.exploit}</p>
            {selectedRule.refs.length ? (
              <>
                <h3>{t('security.bookRefs')}</h3>
                <ul className="ml-security-detail__refs">
                  {selectedRule.refs.map((ref) => (
                    <li key={ref}>
                      <code>{ref}</code>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="ml-security-detail__actions">
              <Button
                type="primary"
                icon={<Icon icon={Bot} variant="micro" />}
                onClick={() => askCopilotAboutRule(selectedRule)}
              >
                {t('security.askCopilot')}
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}