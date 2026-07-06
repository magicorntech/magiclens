import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useAppPalette } from '../../stores/useAppPalette'

interface TerminalViewProps {
  sessionId: string
  isActive: boolean
}

export function TerminalView({ sessionId, isActive }: TerminalViewProps): React.JSX.Element {
  const palette = useAppPalette()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

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

    const unsubData = window.api.terminal.onData((payload) => {
      if (payload.sessionId !== sessionId) return
      term.write(payload.chunk)
    })
    const unsubExit = window.api.terminal.onExit((payload) => {
      if (payload.sessionId !== sessionId) return
      term.write(`\r\n\x1b[33m[Process exited with code ${payload.exitCode}]\x1b[0m\r\n`)
    })

    void window.api.terminal.start({ sessionId, cols: term.cols, rows: term.rows }).then((res) => {
      if (!res.ok) term.write(`\r\n\x1b[31m[Failed to start terminal: ${res.error}]\x1b[0m\r\n`)
    })

    const dataDisposable = term.onData((data) => {
      void window.api.terminal.input({ sessionId, data })
    })
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      void window.api.terminal.resize({ sessionId, cols, rows })
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
      void window.api.terminal.stop({ sessionId })
      term.dispose()
      termRef.current = null
    }
  }, [sessionId, palette.terminalBg, palette.terminalFg, palette.primary])

  useEffect(() => {
    if (!isActive) return
    fitAddonRef.current?.fit()
    termRef.current?.focus()
  }, [isActive])

  return <div ref={containerRef} style={{ height: '100%', padding: 4, boxSizing: 'border-box' }} />
}
