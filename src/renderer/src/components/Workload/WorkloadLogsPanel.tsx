import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Input, Select, message } from 'antd'
import { Download, Pause, Play, RefreshCw, Search } from 'lucide-react'
import dayjs from 'dayjs'
import type { WorkloadKind, WorkloadPodInfo } from '@shared/types/workload'
import type { PodLogsSource } from '@shared/types/pod'
import { useTranslation } from 'react-i18next'
import { useWorkloadPods } from '../../queries/useWorkloadPods'
import { ErrorState, LoadingState } from '../ResourceTable/EmptyErrorStates'
import { Icon } from '../ui/Icon'
import { emptyIllustrations } from '../ui/EmptyIllustration'

interface WorkloadLogsPanelProps {
  clusterId: string
  kind: WorkloadKind
  namespace: string
  name: string
  isActive: boolean
}

interface LogLine {
  source: string
  text: string
}

const MAX_BUFFERED_LINES = 8000
const ALL = '__all__'

const TAIL_PRESETS = [
  { label: '100 lines', value: 100 },
  { label: '500 lines', value: 500 },
  { label: '1000 lines', value: 1000 },
  { label: '2000 lines', value: 2000 },
  { label: 'All available', value: 0 }
] as const

const SINCE_PRESETS = [
  { label: 'From tail only', value: '' },
  { label: 'Last 5 minutes', value: '5m' },
  { label: 'Last 1 hour', value: '1h' },
  { label: 'Last 24 hours', value: '24h' }
] as const

function newSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function sincePresetToIso(preset: string): string | undefined {
  if (!preset) return undefined
  const map: Record<string, number> = { '5m': 5, '1h': 60, '24h': 24 * 60 }
  const minutes = map[preset]
  if (!minutes) return undefined
  return dayjs().subtract(minutes, 'minute').toISOString()
}

function highlightLogLine(line: string, query: string): React.JSX.Element {
  if (!query.trim()) return <>{line || '\u00A0'}</>
  const idx = line.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{line}</>
  return (
    <>
      {line.slice(0, idx)}
      <mark className="ml-log-highlight">{line.slice(idx, idx + query.length)}</mark>
      {line.slice(idx + query.length)}
    </>
  )
}

function sourceHue(source: string): number {
  let h = 0
  for (let i = 0; i < source.length; i++) h = (h * 31 + source.charCodeAt(i)) >>> 0
  return h % 360
}

function resolveSources(
  pods: WorkloadPodInfo[],
  podFilter: string,
  containerFilter: string
): PodLogsSource[] {
  const selected = podFilter === ALL ? pods : pods.filter((p) => p.name === podFilter)
  const sources: PodLogsSource[] = []
  for (const pod of selected) {
    const containers =
      containerFilter === ALL ? pod.containers : pod.containers.filter((c) => c === containerFilter)
    for (const containerName of containers) {
      sources.push({ podName: pod.name, containerName })
    }
  }
  return sources
}

export function WorkloadLogsPanel({
  clusterId,
  kind,
  namespace,
  name,
  isActive
}: WorkloadLogsPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const { data, isLoading, isError, error, refetch } = useWorkloadPods(
    clusterId,
    kind,
    namespace,
    name,
    isActive
  )
  const pods = useMemo((): WorkloadPodInfo[] => {
    if (!data || 'error' in data) return []
    return data.pods
  }, [data])
  const loadError =
    (data && 'error' in data ? data.error : null) ??
    (isError ? (error instanceof Error ? error.message : String(error)) : null)

  const [podFilter, setPodFilter] = useState(ALL)
  const [containerFilter, setContainerFilter] = useState(ALL)
  const [follow, setFollow] = useState(true)
  const [tailLines, setTailLines] = useState<number>(500)
  const [sincePreset, setSincePreset] = useState('')
  const [timestamps, setTimestamps] = useState(false)
  const [previous, setPrevious] = useState(false)
  const [wrap, setWrap] = useState(true)
  const [logSearch, setLogSearch] = useState('')
  const [lines, setLines] = useState<LogLine[]>([])
  const [ended, setEnded] = useState<string | null>(null)
  const [fileName, setFileName] = useState(`${name}.log`)
  const [downloading, setDownloading] = useState(false)
  const [streamKey, setStreamKey] = useState(0)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const bufferBySourceRef = useRef<Map<string, string>>(new Map())

  const containerNames = useMemo(() => {
    const names = new Set<string>()
    for (const pod of pods) for (const c of pod.containers) names.add(c)
    return [...names]
  }, [pods])

  const sources = useMemo(
    () => resolveSources(pods, podFilter, containerFilter),
    [pods, podFilter, containerFilter]
  )
  const sourcesKey = sources.map((s) => `${s.podName}/${s.containerName}`).join(',')
  const showSourcePrefix = sources.length > 1

  const filteredLines = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    if (!q) return lines
    return lines.filter((l) => l.text.toLowerCase().includes(q) || l.source.toLowerCase().includes(q))
  }, [lines, logSearch])

  useEffect(() => {
    if (podFilter !== ALL && !pods.some((p) => p.name === podFilter)) setPodFilter(ALL)
  }, [pods, podFilter])

  useEffect(() => {
    if (containerFilter !== ALL && !containerNames.includes(containerFilter)) setContainerFilter(ALL)
  }, [containerNames, containerFilter])

  useEffect(() => {
    setFileName(`${name}.log`)
  }, [name])

  useEffect(() => {
    if (!isActive || !follow || sources.length === 0) return

    const sessionId = newSessionId()
    sessionIdRef.current = sessionId
    setLines([])
    setEnded(null)
    bufferBySourceRef.current = new Map()

    const unsubData = window.api.pod.logs.onData((payload) => {
      if (payload.sessionId !== sessionId) return
      const source = payload.source ?? 'unknown'
      const buffers = bufferBySourceRef.current
      const pending = (buffers.get(source) ?? '') + payload.chunk
      const parts = pending.split('\n')
      buffers.set(source, parts.pop() ?? '')
      if (parts.length === 0) return
      setLines((prev) => {
        const next = prev.concat(parts.map((text) => ({ source, text })))
        return next.length > MAX_BUFFERED_LINES ? next.slice(next.length - MAX_BUFFERED_LINES) : next
      })
    })

    const unsubEnded = window.api.pod.logs.onEnded((payload) => {
      if (payload.sessionId !== sessionId) return
      setEnded(payload.error ?? t('resourceDetail.workloadLogs.ended'))
    })

    if (typeof window.api.pod.logs.startMerged !== 'function') {
      setEnded(t('resourceDetail.workloadLogs.unavailable'))
      return () => {
        unsubData()
        unsubEnded()
      }
    }

    void window.api.pod.logs.startMerged({
      sessionId,
      clusterId,
      namespace,
      pods: sources,
      tailLines: tailLines > 0 ? tailLines : undefined,
      timestamps,
      sinceTime: sincePresetToIso(sincePreset),
      previous,
      follow: true
    }).catch((err: unknown) => {
      if (sessionIdRef.current === sessionId) {
        setEnded(err instanceof Error ? err.message : String(err))
      }
    })

    return () => {
      unsubData()
      unsubEnded()
      void window.api.pod.logs.stop({ sessionId })
    }
    // sourcesKey is the stable identity of `sources` — the array itself is a new reference
    // every time the pods query refetches even when the set of streams has not changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clusterId,
    namespace,
    sourcesKey,
    tailLines,
    sincePreset,
    timestamps,
    previous,
    follow,
    isActive,
    streamKey,
    t
  ])

  useEffect(() => {
    if (follow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines, follow])

  async function handleDownload(): Promise<void> {
    if (sources.length === 0) return
    setDownloading(true)
    try {
      const res = await window.api.pod.logs.downloadMerged({
        clusterId,
        namespace,
        pods: sources,
        defaultFileName: fileName.trim() || `${name}.log`,
        timestamps
      })
      if (res.ok) {
        message.success(t('resourceDetail.workloadLogs.saved', { path: res.filePath }))
      } else if (!('canceled' in res)) {
        message.error(res.error)
      }
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) return <LoadingState />
  if (loadError) return <ErrorState message={loadError} onRetry={() => void refetch()} />

  const LogsIllustration = emptyIllustrations.logs

  return (
    <div className="ml-log-viewer">
      <div className="ml-log-toolbar">
        <Select
          size="small"
          value={podFilter}
          onChange={setPodFilter}
          options={[
            { label: t('resourceDetail.workloadLogs.allPods', { count: pods.length }), value: ALL },
            ...pods.map((p) => ({
              label: `${p.name}${p.ready ? '' : ` (${p.status})`}`,
              value: p.name
            }))
          ]}
          style={{ minWidth: 180 }}
        />
        {containerNames.length > 1 ? (
          <Select
            size="small"
            value={containerFilter}
            onChange={setContainerFilter}
            options={[
              { label: t('resourceDetail.workloadLogs.allContainers'), value: ALL },
              ...containerNames.map((c) => ({ label: c, value: c }))
            ]}
            style={{ width: 160 }}
          />
        ) : null}
        <Select
          size="small"
          value={tailLines}
          onChange={setTailLines}
          options={TAIL_PRESETS.map((p) => ({ label: p.label, value: p.value }))}
          style={{ width: 120 }}
        />
        <Select
          size="small"
          value={sincePreset}
          onChange={setSincePreset}
          options={SINCE_PRESETS.map((p) => ({ label: p.label, value: p.value }))}
          style={{ width: 140 }}
        />
        <label className="ml-log-toggle">
          <input type="checkbox" checked={timestamps} onChange={(e) => setTimestamps(e.target.checked)} />
          Timestamps
        </label>
        <label className="ml-log-toggle">
          <input type="checkbox" checked={previous} onChange={(e) => setPrevious(e.target.checked)} />
          Previous
        </label>
        <label className="ml-log-toggle">
          <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} />
          Wrap
        </label>
        <button
          type="button"
          className={`ml-btn ml-btn--ghost${follow ? ' ml-btn--active' : ''}`}
          onClick={() => setFollow((f) => !f)}
        >
          <Icon icon={follow ? Play : Pause} variant="detail" />
          {follow ? t('resourceDetail.workloadLogs.following') : t('resourceDetail.workloadLogs.paused')}
        </button>
        <button
          type="button"
          className="ml-btn ml-btn--ghost"
          onClick={() => setStreamKey((k) => k + 1)}
          disabled={!follow}
        >
          <Icon icon={RefreshCw} variant="detail" />
          {t('resourceDetail.workloadLogs.restart')}
        </button>
        <Input
          size="small"
          prefix={<Icon icon={Search} variant="detail" />}
          placeholder={t('resourceDetail.workloadLogs.filter')}
          value={logSearch}
          onChange={(e) => setLogSearch(e.target.value)}
          style={{ width: 180 }}
          allowClear
        />
        <Input
          size="small"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          style={{ width: 160 }}
          placeholder="filename.log"
        />
        <button
          type="button"
          className="ml-btn ml-btn--ghost"
          disabled={downloading || sources.length === 0}
          onClick={() => void handleDownload()}
        >
          <Icon icon={Download} variant="detail" />
          {t('resourceDetail.workloadLogs.download')}
        </button>
      </div>

      {!follow && (
        <Alert
          type="info"
          showIcon
          message={t('resourceDetail.workloadLogs.pausedBanner')}
          style={{ marginBottom: 8, flexShrink: 0 }}
        />
      )}
      {ended && <Alert type="warning" showIcon message={ended} style={{ marginBottom: 8, flexShrink: 0 }} />}

      <div ref={scrollRef} className={`ml-log-surface${wrap ? ' ml-log-surface--wrap' : ''}`}>
        {sources.length === 0 ? (
          <div className="ml-log-empty">
            <LogsIllustration />
            <span>{t('resourceDetail.workloadLogs.noPods')}</span>
          </div>
        ) : filteredLines.length === 0 ? (
          <div className="ml-log-empty">
            <LogsIllustration />
            <span>
              {follow
                ? t('resourceDetail.workloadLogs.waiting', { count: sources.length })
                : t('resourceDetail.workloadLogs.pausedBanner')}
            </span>
          </div>
        ) : (
          filteredLines.map((line, i) => (
            <div key={i} className="ml-log-line">
              {showSourcePrefix ? (
                <span
                  className="ml-log-source"
                  style={{ color: `hsl(${sourceHue(line.source)} 62% 58%)` }}
                  title={line.source}
                >
                  {line.source}
                </span>
              ) : null}
              {highlightLogLine(line.text, logSearch)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
