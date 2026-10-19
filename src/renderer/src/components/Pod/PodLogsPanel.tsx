import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Input, Select, message } from 'antd'
import { Download, Pause, Play, RefreshCw, Search } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { isPodDetailData } from '@shared/types/pod'
import type { WorkloadKind } from '@shared/types/workload'
import { usePodDetail } from '../../queries/usePodDetail'
import { useWorkloadPods } from '../../queries/useWorkloadPods'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { Icon } from '../ui/Icon'
import { emptyIllustrations } from '../ui/EmptyIllustration'
import { highlightLogLine } from './logHighlight'

interface PodLogsPanelProps {
  clusterId: string
  namespace: string
  podName: string
  isActive: boolean
}

const MAX_BUFFERED_LINES = 5000

const OWNER_KIND: Record<string, WorkloadKind> = {
  ReplicaSet: 'ReplicaSets',
  StatefulSet: 'StatefulSets',
  DaemonSet: 'DaemonSets',
  Job: 'Jobs',
  ReplicationController: 'ReplicationControllers'
}

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

export function PodLogsPanel({ clusterId, namespace, podName, isActive }: PodLogsPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const { data: detail, isLoading } = usePodDetail(clusterId, namespace, podName, isActive)
  const owner = isPodDetailData(detail)
    ? (detail.ownerReferences.find((ref) => ref.controller) ?? detail.ownerReferences[0])
    : undefined
  const workloadKind = owner ? (OWNER_KIND[owner.kind] ?? null) : null
  const { data: siblingData } = useWorkloadPods(
    clusterId,
    workloadKind ?? 'ReplicaSets',
    namespace,
    workloadKind && owner ? owner.name : '',
    isActive
  )
  const siblingPods = useMemo(() => {
    if (!siblingData || 'error' in siblingData) return []
    return siblingData.pods
  }, [siblingData])

  const [selectedPod, setSelectedPod] = useState(podName)
  const [containerName, setContainerName] = useState<string | null>(null)
  const [follow, setFollow] = useState(true)
  const [tailLines, setTailLines] = useState<number>(500)
  const [sincePreset, setSincePreset] = useState('')
  const [timestamps, setTimestamps] = useState(false)
  const [previous, setPrevious] = useState(false)
  const [wrap, setWrap] = useState(true)
  const [logSearch, setLogSearch] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [ended, setEnded] = useState<string | null>(null)
  const [fileName, setFileName] = useState(`${podName}.log`)
  const [downloading, setDownloading] = useState(false)
  const [streamKey, setStreamKey] = useState(0)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const bufferRef = useRef('')
  const keepBufferRef = useRef(false)

  const activePod = siblingPods.some((p) => p.name === selectedPod) ? selectedPod : podName
  const containers = useMemo(() => {
    const fromSibling = siblingPods.find((p) => p.name === activePod)?.containers
    if (fromSibling && fromSibling.length > 0) return fromSibling
    return isPodDetailData(detail) ? detail.containers.map((c) => c.name) : []
  }, [siblingPods, activePod, detail])

  const filteredLines = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    if (!q) return lines
    return lines.filter((l) => l.toLowerCase().includes(q))
  }, [lines, logSearch])
  const query = logSearch.trim()
  const hasFilterMiss = query.length > 0 && lines.length > 0 && filteredLines.length === 0

  useEffect(() => {
    setSelectedPod(podName)
  }, [podName])

  useEffect(() => {
    if (!containerName || !containers.includes(containerName)) {
      setContainerName(containers[0] ?? null)
    }
  }, [containers, containerName])

  useEffect(() => {
    setFileName(`${activePod}.log`)
  }, [activePod])

  useEffect(() => {
    if (!isActive || !containerName || !follow) return

    const sessionId = newSessionId()
    sessionIdRef.current = sessionId
    bufferRef.current = ''
    setEnded(null)
    if (keepBufferRef.current) {
      keepBufferRef.current = false
      setLines((prev) => (prev.length > 0 ? [...prev, t('podDetail.logs.restarted')] : prev))
    } else {
      setLines([])
    }

    const unsubData = window.api.pod.logs.onData((payload) => {
      if (payload.sessionId !== sessionId) return
      bufferRef.current += payload.chunk
      const parts = bufferRef.current.split('\n')
      bufferRef.current = parts.pop() ?? ''
      if (parts.length === 0) return
      setLines((prev) => {
        const next = prev.concat(parts)
        return next.length > MAX_BUFFERED_LINES ? next.slice(next.length - MAX_BUFFERED_LINES) : next
      })
    })

    const unsubEnded = window.api.pod.logs.onEnded((payload) => {
      if (payload.sessionId !== sessionId) return
      setEnded(payload.error ?? t('podDetail.logs.ended'))
    })

    void window.api.pod.logs.start({
      sessionId,
      clusterId,
      namespace,
      podName: activePod,
      containerName,
      tailLines: tailLines > 0 ? tailLines : undefined,
      timestamps,
      sinceTime: sincePresetToIso(sincePreset),
      previous,
      follow: true
    })

    return () => {
      unsubData()
      unsubEnded()
      void window.api.pod.logs.stop({ sessionId })
    }
  }, [
    clusterId,
    namespace,
    activePod,
    containerName,
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
  }, [filteredLines, follow])

  async function handleDownload(): Promise<void> {
    if (!containerName) return
    setDownloading(true)
    try {
      const res = await window.api.pod.logs.download({
        clusterId,
        namespace,
        podName: activePod,
        containerName,
        defaultFileName: fileName.trim() || `${activePod}.log`
      })
      if (res.ok) {
        message.success(t('podDetail.logs.downloaded', { path: res.filePath }))
      } else if (!('canceled' in res)) {
        message.error(res.error)
      }
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) return <LoadingState />

  const LogsIllustration = emptyIllustrations.logs

  return (
    <div className="ml-log-viewer">
      <div className="ml-log-toolbar">
        {siblingPods.length > 1 ? (
          <Select
            size="small"
            aria-label={t('podDetail.logs.pod')}
            value={activePod}
            onChange={setSelectedPod}
            options={siblingPods.map((p) => ({
              label: `${p.name}${p.ready ? '' : ` (${p.status})`}`,
              value: p.name
            }))}
            style={{ minWidth: 180 }}
          />
        ) : null}
        {containers.length > 0 ? (
          <Select
            size="small"
            aria-label={t('podDetail.logs.container')}
            value={containerName}
            onChange={setContainerName}
            options={containers.map((c) => ({ label: c, value: c }))}
            style={{ width: 160 }}
          />
        ) : null}
        <Select size="small" value={tailLines} onChange={setTailLines} options={TAIL_PRESETS.map((p) => ({ label: p.label, value: p.value }))} style={{ width: 120 }} />
        <Select size="small" value={sincePreset} onChange={setSincePreset} options={SINCE_PRESETS.map((p) => ({ label: p.label, value: p.value }))} style={{ width: 140 }} />
        <label className="ml-log-toggle">
          <input type="checkbox" checked={timestamps} onChange={(e) => setTimestamps(e.target.checked)} />
          {t('podDetail.logs.timestamps')}
        </label>
        <label className="ml-log-toggle">
          <input type="checkbox" checked={previous} onChange={(e) => setPrevious(e.target.checked)} />
          {t('podDetail.logs.previous')}
        </label>
        <label className="ml-log-toggle">
          <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} />
          {t('podDetail.logs.wrap')}
        </label>
        <button type="button" className={`ml-btn ml-btn--ghost${follow ? ' ml-btn--active' : ''}`} onClick={() => setFollow((f) => !f)}>
          <Icon icon={follow ? Play : Pause} variant="detail" />
          {follow ? t('podDetail.logs.following') : t('podDetail.logs.paused')}
        </button>
        <button
          type="button"
          className="ml-btn ml-btn--ghost"
          onClick={() => {
            keepBufferRef.current = true
            setStreamKey((k) => k + 1)
          }}
          disabled={!follow}
        >
          <Icon icon={RefreshCw} variant="detail" />
          {t('podDetail.logs.restart')}
        </button>
        <Input
          size="small"
          className="ml-log-search"
          prefix={<Icon icon={Search} variant="detail" />}
          placeholder={t('podDetail.logs.filter')}
          value={logSearch}
          onChange={(e) => setLogSearch(e.target.value)}
          allowClear
          suffix={
            query ? (
              <span className="ml-log-match">
                {t('podDetail.logs.matchCount', { shown: filteredLines.length, total: lines.length })}
              </span>
            ) : null
          }
        />
        <Input size="small" value={fileName} onChange={(e) => setFileName(e.target.value)} style={{ width: 160 }} placeholder="filename.log" />
        <button type="button" className="ml-btn ml-btn--ghost" disabled={downloading} onClick={() => void handleDownload()}>
          <Icon icon={Download} variant="detail" />
          {t('resourceDetail.workloadLogs.download')}
        </button>
      </div>

      {!follow && (
        <Alert type="info" showIcon message={t('podDetail.logs.pausedBanner')} style={{ marginBottom: 8, flexShrink: 0 }} />
      )}
      {ended && <Alert type="warning" showIcon message={ended} style={{ marginBottom: 8, flexShrink: 0 }} />}

      <div ref={scrollRef} className={`ml-log-surface${wrap ? ' ml-log-surface--wrap' : ''}`}>
        {filteredLines.length === 0 ? (
          <div className="ml-log-empty">
            <LogsIllustration />
            <span>
              {hasFilterMiss
                ? t('podDetail.logs.noMatch', { query })
                : follow
                  ? t('podDetail.logs.waiting')
                  : t('podDetail.logs.pausedBanner')}
            </span>
          </div>
        ) : (
          filteredLines.map((line, i) => (
            <div key={i} className="ml-log-line">
              {highlightLogLine(line, logSearch)}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
