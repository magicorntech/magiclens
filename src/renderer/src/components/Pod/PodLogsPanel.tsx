import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Checkbox, Input, Select, Space, Typography, message, theme } from 'antd'
import { DownloadOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { usePodDetail } from '../../queries/usePodDetail'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'

interface PodLogsPanelProps {
  clusterId: string
  namespace: string
  podName: string
  isActive: boolean
}

const MAX_BUFFERED_LINES = 5000

function newSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function PodLogsPanel({ clusterId, namespace, podName, isActive }: PodLogsPanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { data: detail, isLoading } = usePodDetail(clusterId, namespace, podName, isActive)
  const containers = useMemo(() => detail?.containers.map((c) => c.name) ?? [], [detail])

  const [containerName, setContainerName] = useState<string | null>(null)
  const [follow, setFollow] = useState(true)
  const [lines, setLines] = useState<string[]>([])
  const [ended, setEnded] = useState<string | null>(null)
  const [fileName, setFileName] = useState(`${podName}.log`)
  const [downloading, setDownloading] = useState(false)

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
    if (!containerName) return

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
      tailLines: 500
    })

    return () => {
      unsubData()
      unsubEnded()
      void window.api.pod.logs.stop({ sessionId })
    }
  }, [clusterId, namespace, podName, containerName])

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
        <Checkbox checked={follow} onChange={(e) => setFollow(e.target.checked)}>
          {follow ? <PlayCircleOutlined /> : <PauseCircleOutlined />} Follow
        </Checkbox>
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

      {ended && <Alert type="warning" showIcon message={ended} style={{ marginBottom: 8, flexShrink: 0 }} />}

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          background: '#0d1117',
          color: '#c9d1d9',
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
          <Typography.Text style={{ color: '#8b949e' }}>Waiting for log output...</Typography.Text>
        ) : (
          lines.map((line, i) => <div key={i}>{line || '\u00A0'}</div>)
        )}
      </div>
    </div>
  )
}
