import { useEffect, useMemo, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { IDisposable, Position as MonacoPosition } from 'monaco-editor'
import type { editor as MonacoEditorNS } from 'monaco-editor'
import { marked } from 'marked'
import type { NoteEditorMode, ResourceNote } from '@shared/types/notes'
import type {
  SparksPaperExtend,
  SparksPaperStyle,
  SparksPaperWidth,
  SparksPaperZoom,
  SparksSurfaceMode,
  SparksThemeId
} from '@shared/types/sparks'
import { setupMonaco } from '../Editor/setupMonaco'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { renderWikiLinksHtml, resolveWikiTarget } from './wikiLinks'
import { normalizeSparksThemeId } from './sparksCatalog'
import { toSparksMediaUrl } from './sparksMedia'
import { SparksSketchPad } from './SparksSketchPad'

interface MarkdownNoteEditorProps {
  noteId: string
  title: string
  body: string
  mode: NoteEditorMode
  notes: ResourceNote[]
  themeId?: SparksThemeId
  paperStyle?: SparksPaperStyle
  paperWidth?: SparksPaperWidth
  paperZoom?: SparksPaperZoom
  paperExtend?: SparksPaperExtend
  surfaceMode?: SparksSurfaceMode
  vaultPath?: string | null
  /** Seeded Welcome note — preview only, no title/body edits. */
  readOnly?: boolean
  onTitleChange: (title: string) => void
  onBodyChange: (body: string) => void
  onOpenNote: (id: string) => void
  onCreateMissing: (title: string) => void
}

function rewriteLocalMedia(html: string): string {
  return html
    .replace(/\ssrc="(?!https?:|data:|file:|blob:|sparks-media:)([^"]+)"/gi, (_m, src: string) => {
      const rel = src.replace(/^\.?\//, '')
      return ` src="${toSparksMediaUrl(rel)}"`
    })
    .replace(/\shref="(?!https?:|mailto:|file:|#|sparks-media:)([^"]+)"/gi, (_m, href: string) => {
      if (href.startsWith('[[')) return ` href="${href}"`
      const rel = href.replace(/^\.?\//, '')
      return ` href="${toSparksMediaUrl(rel)}"`
    })
}

marked.setOptions({ gfm: true, breaks: true })

const THEME_DEFS: Record<
  string,
  {
    base: 'vs' | 'vs-dark'
    bg: string
    fg: string
    accent: string
    muted: string
    select: string
    widget: string
  }
> = {
  defaultLight: {
    base: 'vs',
    bg: '#ffffff',
    fg: '#1f2937',
    accent: '#2563eb',
    muted: '#6b7280',
    select: '#2563eb22',
    widget: '#f8fafc'
  },
  defaultDark: {
    base: 'vs-dark',
    bg: '#111827',
    fg: '#e5e7eb',
    accent: '#60a5fa',
    muted: '#9ca3af',
    select: '#60a5fa33',
    widget: '#1f2937'
  },
  paper: {
    base: 'vs',
    bg: '#fffcf7',
    fg: '#2a241c',
    accent: '#9a6b3a',
    muted: '#8a7c6a',
    select: '#9a6b3a28',
    widget: '#f7f2ea'
  },
  ink: {
    base: 'vs-dark',
    bg: '#161922',
    fg: '#e8eaef',
    accent: '#8da2ff',
    muted: '#6f788a',
    select: '#8da2ff33',
    widget: '#1c2030'
  },
  parchment: {
    base: 'vs',
    bg: '#f7f0e2',
    fg: '#3a2f22',
    accent: '#a15c2e',
    muted: '#8d765a',
    select: '#a15c2e28',
    widget: '#efe4d0'
  },
  mono: {
    base: 'vs',
    bg: '#ffffff',
    fg: '#0f172a',
    accent: '#334155',
    muted: '#94a3b8',
    select: '#33415522',
    widget: '#f1f5f9'
  },
  matcha: {
    base: 'vs',
    bg: '#f7fbf5',
    fg: '#1f3324',
    accent: '#4d7c57',
    muted: '#7a9480',
    select: '#4d7c5728',
    widget: '#eef5eb'
  },
  ocean: {
    base: 'vs',
    bg: '#f5fbfc',
    fg: '#0f2f33',
    accent: '#0f766e',
    muted: '#6b9196',
    select: '#0f766e28',
    widget: '#e8f2f4'
  },
  forest: {
    base: 'vs',
    bg: '#f4f8f3',
    fg: '#1c2e20',
    accent: '#3f6b4a',
    muted: '#758a78',
    select: '#3f6b4a28',
    widget: '#e9efe8'
  },
  rose: {
    base: 'vs',
    bg: '#fdf7f8',
    fg: '#3a242a',
    accent: '#a85d6c',
    muted: '#a4848d',
    select: '#a85d6c28',
    widget: '#f6ecef'
  },
  dusk: {
    base: 'vs-dark',
    bg: '#1b222d',
    fg: '#e4eaf1',
    accent: '#7eb6c9',
    muted: '#6f8194',
    select: '#7eb6c933',
    widget: '#141820'
  },
  nord: {
    base: 'vs-dark',
    bg: '#3b4252',
    fg: '#eceff4',
    accent: '#88c0d0',
    muted: '#9aa5b5',
    select: '#88c0d033',
    widget: '#2e3440'
  },
  solar: {
    base: 'vs-dark',
    bg: '#262018',
    fg: '#f2e8d5',
    accent: '#d4a017',
    muted: '#8f8168',
    select: '#d4a01733',
    widget: '#1c1812'
  },
  ember: {
    base: 'vs-dark',
    bg: '#221c1d',
    fg: '#f3e9e7',
    accent: '#e07a5f',
    muted: '#8f7570',
    select: '#e07a5f33',
    widget: '#161314'
  }
}

function resolveThemeKey(themeId: SparksThemeId | undefined, isDark: boolean): string {
  const id = normalizeSparksThemeId(themeId)
  if (id === 'default') return isDark ? 'defaultDark' : 'defaultLight'
  return id
}

function ensureSparksMonacoThemes(monaco: typeof import('monaco-editor')): void {
  for (const [name, t] of Object.entries(THEME_DEFS)) {
    monaco.editor.defineTheme(`sparks-${name}`, {
      base: t.base,
      inherit: true,
      rules: [
        { token: 'comment', foreground: t.muted.replace('#', ''), fontStyle: 'italic' },
        { token: 'keyword', foreground: t.accent.replace('#', '') },
        { token: 'string', foreground: t.fg.replace('#', '') },
        { token: 'emphasis', fontStyle: 'italic' },
        { token: 'strong', fontStyle: 'bold' }
      ],
      colors: {
        'editor.background': t.bg,
        'editor.foreground': t.fg,
        'editorCursor.foreground': t.accent,
        'editor.lineHighlightBackground': '#00000000',
        'editor.lineHighlightBorder': '#00000000',
        'editor.selectionBackground': t.select,
        'editor.inactiveSelectionBackground': t.select,
        'editorWidget.background': t.widget,
        'editorWidget.border': t.select,
        'editorSuggestWidget.background': t.widget,
        'editorSuggestWidget.border': t.select,
        'editorSuggestWidget.selectedBackground': t.select,
        'editorGutter.background': t.bg,
        'editorLineNumber.foreground': t.muted,
        'scrollbarSlider.background': `${t.muted}44`,
        'scrollbarSlider.hoverBackground': `${t.muted}66`,
        'scrollbar.shadow': '#00000000',
        'editorOverviewRuler.border': '#00000000',
        focusBorder: '#00000000'
      }
    })
  }
}

export function MarkdownNoteEditor({
  noteId,
  title,
  body,
  mode,
  notes,
  themeId,
  paperStyle = 'plain',
  paperWidth = 'md',
  paperZoom = 'normal',
  paperExtend = 'normal',
  surfaceMode = 'write',
  vaultPath,
  readOnly = false,
  onTitleChange,
  onBodyChange,
  onOpenNote,
  onCreateMissing
}: MarkdownNoteEditorProps): React.JSX.Element {
  const isDark = useResolvedDarkMode()
  const [html, setHtml] = useState('')
  const [editorHeight, setEditorHeight] = useState(520)
  const notesRef = useRef(notes)
  notesRef.current = notes
  const disposables = useRef<IDisposable[]>([])
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const pageMinRef = useRef(520)

  const themeKey = resolveThemeKey(themeId, isDark)
  const monacoTheme = `sparks-${themeKey}`

  useEffect(() => {
    const map = { normal: 520, tall: 1100, long: 1800 } as const
    pageMinRef.current = map[paperExtend] ?? 520
    const ed = editorRef.current
    if (ed) {
      const content = Math.ceil(ed.getContentHeight())
      setEditorHeight(Math.max(pageMinRef.current, content + 24))
    } else {
      setEditorHeight(pageMinRef.current)
    }
  }, [paperExtend])

  useEffect(() => {
    setupMonaco()
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve(marked.parse(body || ''))
      .then((result) => {
        if (cancelled) return
        const raw = typeof result === 'string' ? result : String(result)
        setHtml(rewriteLocalMedia(renderWikiLinksHtml(raw, notesRef.current)))
      })
      .catch(() => {
        if (!cancelled) setHtml('')
      })
    return () => {
      cancelled = true
    }
  }, [body, notes])

  useEffect(() => {
    if (!monacoRef.current) return
    ensureSparksMonacoThemes(monacoRef.current)
    monacoRef.current.editor.setTheme(monacoTheme)
  }, [monacoTheme])

  const showEditor = !readOnly && (mode === 'edit' || mode === 'live')
  const showPreview = readOnly || mode === 'preview' || mode === 'live'
  const sketchOpen = !readOnly && surfaceMode === 'draw'

  const editorOptions = useMemo(
    () =>
      ({
        readOnly: false,
        fontSize: 15,
        lineHeight: 26,
        fontFamily:
          'ui-sans-serif, "Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontLigatures: false,
        wordWrap: 'on' as const,
        wrappingStrategy: 'advanced' as const,
        minimap: { enabled: false },
        lineNumbers: 'off' as const,
        glyphMargin: false,
        folding: false,
        renderLineHighlight: 'none' as const,
        scrollBeyondLastLine: false,
        padding: { top: 8, bottom: 48 },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        scrollbar: {
          vertical: 'hidden' as const,
          horizontal: 'hidden' as const,
          handleMouseWheel: false,
          alwaysConsumeMouseWheel: false
        },
        automaticLayout: true,
        contextmenu: false,
        quickSuggestions: false,
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: 'off' as const,
        renderWhitespace: 'none' as const,
        guides: { indentation: false },
        cursorBlinking: 'smooth' as const,
        cursorSmoothCaretAnimation: 'on' as const,
        smoothScrolling: true,
        occurrencesHighlight: 'off' as const,
        selectionHighlight: false,
        matchBrackets: 'never' as const,
        links: false
      }) as const,
    []
  )

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed
    monacoRef.current = monaco
    ensureSparksMonacoThemes(monaco)
    monaco.editor.setTheme(monacoTheme)

    disposables.current.forEach((d) => d.dispose())
    disposables.current = []

    const syncHeight = (): void => {
      const content = Math.ceil(ed.getContentHeight())
      setEditorHeight(Math.max(pageMinRef.current, content + 24))
    }
    syncHeight()
    disposables.current.push(ed.onDidContentSizeChange(syncHeight))

    const completion = monaco.languages.registerCompletionItemProvider('markdown', {
      triggerCharacters: ['['],
      provideCompletionItems: (model: MonacoEditorNS.ITextModel, position: MonacoPosition) => {
        const textUntil = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: Math.max(1, position.column - 80),
          endLineNumber: position.lineNumber,
          endColumn: position.column
        })
        const m = /\[\[([^\]]*)$/.exec(textUntil)
        if (!m) return { suggestions: [] }
        const query = m[1].toLowerCase()
        const startCol = position.column - m[1].length
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: startCol,
          endColumn: position.column
        }
        return {
          suggestions: notesRef.current
            .filter((n) => !query || n.title.toLowerCase().includes(query))
            .slice(0, 30)
            .map((n) => ({
              label: n.title,
              kind: monaco.languages.CompletionItemKind.Reference,
              insertText: `${n.title}]]`,
              detail: n.path,
              range
            }))
        }
      }
    })
    disposables.current.push(completion)

    ed.onMouseDown((e) => {
      if (!e.event.metaKey && !e.event.ctrlKey) return
      const pos = e.target.position
      if (!pos) return
      const model = ed.getModel()
      if (!model) return
      const line = model.getLineContent(pos.lineNumber)
      const re = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g
      let match: RegExpExecArray | null
      while ((match = re.exec(line)) !== null) {
        const start = match.index + 1
        const end = match.index + match[0].length
        if (pos.column >= start && pos.column <= end + 1) {
          const resolved = resolveWikiTarget(match[1], notesRef.current)
          if (resolved) onOpenNote(resolved.id)
          else onCreateMissing(match[1].trim())
          break
        }
      }
    })
  }

  useEffect(() => {
    return () => {
      disposables.current.forEach((d) => d.dispose())
      disposables.current = []
    }
  }, [])

  function handlePreviewClick(e: React.MouseEvent<HTMLElement>): void {
    const target = (e.target as HTMLElement).closest('a.ml-wikilink') as HTMLAnchorElement | null
    if (!target) return
    e.preventDefault()
    const id = target.dataset.noteId
    if (id) {
      onOpenNote(id)
      return
    }
    const missing = target.dataset.wikiTarget
    if (missing) onCreateMissing(missing)
  }

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const onWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement | null
      if (!target) return
      // Always drive the page scroller — Monaco/preview must not trap the wheel.
      if (target.closest('.ml-md-editor__pane--edit, .ml-md-editor__pane--preview, .monaco-editor')) {
        scroller.scrollTop += e.deltaY
        scroller.scrollLeft += e.deltaX
        e.preventDefault()
      }
    }
    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => scroller.removeEventListener('wheel', onWheel)
  }, [noteId, mode, showEditor, showPreview])

  return (
    <div
      className={`ml-md-editor ml-md-editor--${mode} ml-md-editor--paper-${paperStyle} ml-md-editor--w-${paperWidth} ml-md-editor--zoom-${paperZoom} ml-md-editor--extend-${paperExtend}${sketchOpen ? ' is-sketching' : ''}`}
    >
      <div className="ml-md-editor__scroll" ref={scrollRef}>
        <div
          className={`ml-md-editor__sheet ml-md-editor__sheet--${paperStyle} ml-md-editor__sheet--w-${paperWidth} ml-md-editor__sheet--zoom-${paperZoom} ml-md-editor__sheet--extend-${paperExtend}`}
        >
          <header className="ml-md-editor__header">
            <input
              className="ml-md-editor__title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled"
              spellCheck
              readOnly={readOnly}
              disabled={readOnly}
            />
            <div className="ml-md-editor__rule" aria-hidden />
          </header>

          <div className="ml-md-editor__panes">
            {showEditor ? (
              <div className="ml-md-editor__pane ml-md-editor__pane--edit">
                <Editor
                  height={editorHeight}
                  language="markdown"
                  theme={monacoTheme}
                  value={body}
                  onChange={(v) => onBodyChange(v ?? '')}
                  onMount={handleMount}
                  options={editorOptions}
                  loading={<div className="ml-md-editor__loading">Loading editor…</div>}
                />
              </div>
            ) : null}
            {showPreview ? (
              <div className="ml-md-editor__pane ml-md-editor__pane--preview">
                <article
                  className="ml-md-preview"
                  onClick={handlePreviewClick}
                  dangerouslySetInnerHTML={{
                    __html: html || '<p class="ml-md-preview__empty"></p>'
                  }}
                />
              </div>
            ) : null}
          </div>

          <SparksSketchPad
            noteId={noteId}
            active={sketchOpen}
            vaultPath={vaultPath}
            onInsertMarkdown={(snippet) => onBodyChange(`${body.trimEnd()}\n${snippet}`)}
          />
        </div>
      </div>
    </div>
  )
}
