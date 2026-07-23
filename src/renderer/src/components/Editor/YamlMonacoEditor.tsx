import { useCallback, useEffect, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Alert, message } from 'antd'
import { AlignLeft, CheckCircle2, Play, Search } from 'lucide-react'
import { parse } from 'yaml'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { Icon } from '../ui/Icon'
import { setupMonaco } from './setupMonaco'

interface YamlMonacoEditorProps {
  value: string
  onChange: (value: string) => void
  mode: 'edit' | 'create'
  resourceLabel?: string
  saving?: boolean
  error?: string | null
  onSave: () => void
}

setupMonaco()

export function YamlMonacoEditor({
  value,
  onChange,
  mode,
  resourceLabel,
  saving = false,
  error,
  onSave
}: YamlMonacoEditorProps): React.JSX.Element {
  const isDark = useResolvedDarkMode()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [validation, setValidation] = useState<string | null>(null)

  const handleMount: OnMount = useCallback((ed) => {
    editorRef.current = ed
    ed.focus()
    requestAnimationFrame(() => ed.layout())
  }, [])

  useEffect(() => {
    return () => {
      const ed = editorRef.current
      editorRef.current = null
      ed?.dispose()
    }
  }, [])

  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      editorRef.current?.layout()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function handleSearch(): void {
    editorRef.current?.getAction('actions.find')?.run()
  }

  function handleFormat(): void {
    void editorRef.current?.getAction('editor.action.formatDocument')?.run()
  }

  function handleValidate(): void {
    try {
      const docs = parse(value, { prettyErrors: true })
      const count = Array.isArray(docs) ? docs.length : 1
      setValidation(`Valid YAML — ${count} document(s)`)
      message.success('YAML is valid')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setValidation(msg)
      message.error('YAML validation failed')
    }
  }

  return (
    <div className="ml-yaml-editor">
      <div className="ml-yaml-editor-toolbar">
        <div className="ml-yaml-editor-breadcrumb">
          <span className="ml-yaml-editor-crumb">{mode === 'create' ? 'Create' : 'Edit'}</span>
          {resourceLabel && (
            <>
              <span className="ml-yaml-editor-sep">/</span>
              <span className="ml-yaml-editor-crumb ml-yaml-editor-crumb--active">{resourceLabel}</span>
            </>
          )}
        </div>
        <div className="ml-yaml-editor-actions">
          {error && (
            <span className="ml-yaml-editor-error" title={error}>
              {error}
            </span>
          )}
          {validation && !error && <span className="ml-yaml-editor-valid">{validation}</span>}
          <button type="button" className="ml-btn ml-btn--ghost" onClick={handleSearch}>
            <Icon icon={Search} variant="detail" />
            Search
          </button>
          <button type="button" className="ml-btn ml-btn--ghost" onClick={handleFormat}>
            <Icon icon={AlignLeft} variant="detail" />
            Format
          </button>
          <button type="button" className="ml-btn ml-btn--ghost" onClick={handleValidate}>
            <Icon icon={CheckCircle2} variant="detail" />
            Validate
          </button>
          <button type="button" className="ml-btn ml-btn--primary" disabled={saving} onClick={onSave}>
            <Icon icon={Play} variant="detail" />
            {saving ? 'Applying…' : mode === 'create' ? 'Create' : 'Apply'}
          </button>
        </div>
      </div>
      <div ref={surfaceRef} className="ml-yaml-editor-surface">
        <Editor
          language="yaml"
          theme={isDark ? 'vs-dark' : 'vs'}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'var(--ml-font-mono)',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'line',
            bracketPairColorization: { enabled: true },
            smoothScrolling: false,
            tabSize: 2,
            // Lighter editor surface — fewer decorations keep Monaco's heap smaller.
            renderWhitespace: 'none',
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            wordBasedSuggestions: 'off',
            links: false,
            folding: true,
            glyphMargin: false,
            overviewRulerLanes: 0
          }}
        />
      </div>
    </div>
  )
}
