import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Select, Space, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { isPodDetailData } from '@shared/types/pod'
import { usePodDetail } from '../../queries/usePodDetail'
import { useAppPalette } from '../../stores/useAppPalette'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'

interface PodExecPanelProps {
  clusterId: string
  namespace: string
  podName: string
  isActive: boolean
}

function newSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function PodExecPanel({ clusterId, namespace, podName, isActive }: PodExecPanelProps): React.JSX.Element {
  const palette = useAppPalette()
  const { data: detail, isLoading } = usePodDetail(clusterId, namespace, podName, isActive)
  const containers = useMemo(
    () => (isPodDetailData(detail) ? detail.containers.map((c) => c.name) : []),
    [detail]
  )

  const [containerName, setContainerName] = useState<string | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'exited'>('connecting')
  const [restartToken, setRestartToken] = useState(0)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerName && containers.length > 0) setContainerName(containers[0])
  }, [containers, containerName])

  useEffect(() => {
    if (!containerName || !containerRef.current) return

    const term = new Terminal({
      convertEol: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      theme: { background: palette.terminalBg, foreground: palette.terminalFg, cursor: palette.primary },
      cursorBlink: true
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()
    termRef.current = term
    fitAddonRef.current = fitAddon
    setStatus('connecting')

    const sessionId = newSessionId()

    const unsubData = window.api.pod.exec.onData((payload) => {
      if (payload.sessionId !== sessionId) return
      term.write(payload.chunk)
    })
    const unsubExit = window.api.pod.exec.onExit((payload) => {
      if (payload.sessionId !== sessionId) return
      setStatus('exited')
      term.write(`\r\n\x1b[33m[Session ended: ${payload.reason}]\x1b[0m\r\n`)
    })

    void window.api.pod.exec
      .start({
        sessionId,
        clusterId,
        namespace,
        podName,
        containerName,
        cols: term.cols,
        rows: term.rows
      })
      .then(() => setStatus('connected'))

    const dataDisposable = term.onData((data) => {
      void window.api.pod.exec.input({ sessionId, data })
    })
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      void window.api.pod.exec.resize({ sessionId, cols, rows })
    })

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit()
      } catch {
        // container may be transiently zero-sized during layout changes
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      dataDisposable.dispose()
      resizeDisposable.dispose()
      unsubData()
      unsubExit()
      void window.api.pod.exec.stop({ sessionId })
      term.dispose()
      termRef.current = null
    }
  }, [clusterId, namespace, podName, containerName, restartToken, palette.terminalBg, palette.terminalFg, palette.primary])

  if (isLoading) return <LoadingState />

  const statusTag =
    status === 'connecting' ? (
      <Tag color="gold">Connecting</Tag>
    ) : status === 'connected' ? (
      <Tag color="green">Connected</Tag>
    ) : (
      <Tag color="default">Exited</Tag>
    )

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
        {statusTag}
        <Button size="small" icon={<ReloadOutlined />} onClick={() => setRestartToken((t) => t + 1)}>
          Restart session
        </Button>
      </Space>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          background: 'var(--ml-terminal-bg)',
          padding: 8,
          borderRadius: 6
        }}
      />
    </div>
  )
}
