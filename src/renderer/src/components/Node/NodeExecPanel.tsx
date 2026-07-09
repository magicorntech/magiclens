import { useEffect, useRef, useState } from 'react'
import { Button, Space, Tag, Typography } from 'antd'
import { RefreshCw } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useAppPalette } from '../../stores/useAppPalette'

interface NodeExecPanelProps {
  clusterId: string
  nodeName: string
  isActive: boolean
}

function newSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function NodeExecPanel({ clusterId, nodeName, isActive }: NodeExecPanelProps): React.JSX.Element {
  const palette = useAppPalette()
  const [status, setStatus] = useState<'connecting' | 'connected' | 'exited'>('connecting')
  const [restartToken, setRestartToken] = useState(0)

  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

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
    setStatus('connecting')

    const sessionId = newSessionId()

    const unsubData = window.api.node.exec.onData((payload) => {
      if (payload.sessionId !== sessionId) return
      term.write(payload.chunk)
    })
    const unsubExit = window.api.node.exec.onExit((payload) => {
      if (payload.sessionId !== sessionId) return
      setStatus('exited')
      term.write(`\r\n\x1b[33m[Session ended: ${payload.reason}]\x1b[0m\r\n`)
    })

    void window.api.node.exec
      .start({
        sessionId,
        clusterId,
        nodeName,
        cols: term.cols,
        rows: term.rows
      })
      .then(() => setStatus('connected'))
      .catch((err: unknown) => {
        setStatus('exited')
        const message = err instanceof Error ? err.message : String(err)
        term.write(`\r\n\x1b[31m[Failed to start node shell: ${message}]\x1b[0m\r\n`)
      })

    const dataDisposable = term.onData((data) => {
      void window.api.node.exec.input({ sessionId, data })
    })
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      void window.api.node.exec.resize({ sessionId, cols, rows })
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
      void window.api.node.exec.stop({ sessionId })
      term.dispose()
    }
  }, [clusterId, nodeName, isActive, restartToken, palette.terminalBg, palette.terminalFg, palette.primary])

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
        {statusTag}
        <Button size="small" icon={<Icon icon={RefreshCw} variant="detail" />} onClick={() => setRestartToken((t) => t + 1)}>
          Restart session
        </Button>
      </Space>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
        Opens a host shell via a privileged debug pod on this node (similar to{' '}
        <Typography.Text code>kubectl debug node</Typography.Text>). Requires permission to create privileged pods.
      </Typography.Paragraph>
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
