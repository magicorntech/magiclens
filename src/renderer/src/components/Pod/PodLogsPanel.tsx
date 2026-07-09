import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Input, Select, message } from 'antd'
import { Download, Pause, Play, RefreshCw, Search } from 'lucide-react'
import dayjs from 'dayjs'
import { isPodDetailData } from '@shared/types/pod'
import { usePodDetail } from '../../queries/usePodDetail'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { Icon } from '../ui/Icon'
import { emptyIllustrations } from '../ui/EmptyIllustration'

interface PodLogsPanelProps {
  clusterId: string
  namespace: string
  podName: string
  isActive: boolean
}

const MAX_BUFFERED_LINES = 5000

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

export function PodLogsPanel({ clusterId, namespace, podName, isActive }: PodLogsPanelProps): React.JSX.Element {
  const { data: detail, isLoading } = usePodDetail(clusterId, namespace, podName, isActive)
  const containers = useMemo(
    () => (isPodDetailData(detail) ? detail.containers.map((c) => c.name) : []),
    [detail]
  )

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

  const filteredLines = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    if (!q) return lines
    return lines.filter((l) => l.toLowerCase().includes(q))
  }, [lines, logSearch])

  useEffect(() => {
    if (!containerName && containers.length > 0) setContainerName(containers[0])
  }, [containers, containerName])

  useEffect(() => {
    setFileName(`${podName}.log`)
  }, [podName])

  useEffect(() => {
    if (!isActive || !containerName || !follow) return

    const sessionId = newSessionId()
    sessionIdRef.current = sessionId
    setLines([])
    setEnded(null)
    bufferRef.current = ''

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
      setEnded(payload.error ?? 'Log stream ended')
    })

    void window.api.pod.logs.start({
      sessionId,
      clusterId,
      namespace,
      podName,
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
  }, [clusterId, namespace, podName, containerName, tailLines, sincePreset, timestamps, previous, follow, isActive, streamKey])

  useEffect(() => {
    if (follow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines, follow])

  async function handleDownload(): Promise<void> {
    if (!containerName) return
    setDownloading(true)
    try {
      const res = await window.api.pod.logs.download({
        clusterId,
        namespace,
        podName,
        containerName,
        defaultFileName: fileName.trim() || `${podName}.log`
      })
      if (res.ok) {
        message.success(`Logs saved to ${res.filePath}`)
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
        {containers.length > 1 && (
          <Select size="small" value={containerName} onChange={setContainerName} options={containers.map((c) => ({ label: c, value: c }))} style={{ width: 160 }} />
        )}
        <Select size="small" value={tailLines} onChange={setTailLines} options={TAIL_PRESETS.map((p) => ({ label: p.label, value: p.value }))} style={{ width: 120 }} />
        <Select size="small" value={sincePreset} onChange={setSincePreset} options={SINCE_PRESETS.map((p) => ({ label: p.label, value: p.value }))} style={{ width: 140 }} />
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
        <button type="button" className={`ml-btn ml-btn--ghost${follow ? ' ml-btn--active' : ''}`} onClick={() => setFollow((f) => !f)}>
          <Icon icon={follow ? Play : Pause} variant="detail" />
          {follow ? 'Following' : 'Paused'}
        </button>
        <button type="button" className="ml-btn ml-btn--ghost" onClick={() => setStreamKey((k) => k + 1)} disabled={!follow}>
          <Icon icon={RefreshCw} variant="detail" />
          Restart
        </button>
        <Input
          size="small"
          prefix={<Icon icon={Search} variant="detail" />}
          placeholder="Filter logs"
          value={logSearch}
          onChange={(e) => setLogSearch(e.target.value)}
          style={{ width: 180 }}
          allowClear
        />
        <Input size="small" value={fileName} onChange={(e) => setFileName(e.target.value)} style={{ width: 160 }} placeholder="filename.log" />
        <button type="button" className="ml-btn ml-btn--ghost" disabled={downloading} onClick={() => void handleDownload()}>
          <Icon icon={Download} variant="detail" />
          Download
        </button>
      </div>

      {!follow && (
        <Alert type="info" showIcon message="Log streaming paused" style={{ marginBottom: 8, flexShrink: 0 }} />
      )}
      {ended && <Alert type="warning" showIcon message={ended} style={{ marginBottom: 8, flexShrink: 0 }} />}

      <div
        ref={scrollRef}
        className={`ml-log-surface${wrap ? ' ml-log-surface--wrap' : ''}`}
      >
        {filteredLines.length === 0 ? (
          <div className="ml-log-empty">
            <LogsIllustration />
            <span>{follow ? 'Waiting for log output…' : 'Stream paused.'}</span>
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
