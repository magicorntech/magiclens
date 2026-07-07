import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Checkbox, Input, Select, Space, Typography, message, theme } from 'antd'
import { DownloadOutlined, PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { isPodDetailData } from '@shared/types/pod'
import { usePodDetail } from '../../queries/usePodDetail'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'

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

export function PodLogsPanel({ clusterId, namespace, podName, isActive }: PodLogsPanelProps): React.JSX.Element {
  const { token } = theme.useToken()
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
  const [lines, setLines] = useState<string[]>([])
  const [ended, setEnded] = useState<string | null>(null)
  const [fileName, setFileName] = useState(`${podName}.log`)
  const [downloading, setDownloading] = useState(false)
  const [streamKey, setStreamKey] = useState(0)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const bufferRef = useRef('')

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Space style={{ marginBottom: 8, flexShrink: 0 }} wrap>
        {containers.length > 1 && (
          <Select
            size="small"
            value={containerName}
            onChange={setContainerName}
            options={containers.map((c) => ({ label: c, value: c }))}
            style={{ width: 180 }}
          />
        )}
        <Select
          size="small"
          value={tailLines}
          onChange={setTailLines}
          options={TAIL_PRESETS.map((p) => ({ label: p.label, value: p.value }))}
          style={{ width: 140 }}
        />
        <Select
          size="small"
          value={sincePreset}
          onChange={setSincePreset}
          options={SINCE_PRESETS.map((p) => ({ label: p.label, value: p.value }))}
          style={{ width: 160 }}
        />
        <Checkbox checked={timestamps} onChange={(e) => setTimestamps(e.target.checked)}>
          Timestamps
        </Checkbox>
        <Checkbox checked={previous} onChange={(e) => setPrevious(e.target.checked)}>
          Previous container
        </Checkbox>
        <Checkbox checked={follow} onChange={(e) => setFollow(e.target.checked)}>
          {follow ? <PlayCircleOutlined /> : <PauseCircleOutlined />} Follow
        </Checkbox>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => setStreamKey((k) => k + 1)} disabled={!follow}>
          Restart stream
        </Button>
        <Input
          size="small"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          style={{ width: 220 }}
          placeholder="File name"
        />
        <Button size="small" icon={<DownloadOutlined />} loading={downloading} onClick={handleDownload}>
          Download
        </Button>
      </Space>

      {!follow && (
        <Alert
          type="info"
          showIcon
          message="Log streaming paused"
          description="Enable Follow or click Restart stream to load logs again."
          style={{ marginBottom: 8, flexShrink: 0 }}
        />
      )}
      {ended && <Alert type="warning" showIcon message={ended} style={{ marginBottom: 8, flexShrink: 0 }} />}

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          background: 'var(--ml-terminal-bg)',
          color: 'var(--ml-terminal-fg)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          lineHeight: 1.6,
          padding: 12,
          borderRadius: token.borderRadius,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {lines.length === 0 ? (
          <Typography.Text style={{ color: 'var(--ml-terminal-muted)' }}>
            {follow ? 'Waiting for log output...' : 'Stream paused.'}
          </Typography.Text>
        ) : (
          lines.map((line, i) => <div key={i}>{line || '\u00A0'}</div>)
        )}
      </div>
    </div>
  )
}
