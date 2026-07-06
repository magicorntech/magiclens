import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Space, Typography, message } from 'antd'
import { SaveOutlined, SearchOutlined } from '@ant-design/icons'
import CodeMirror from '@uiw/react-codemirror'
import type { EditorView } from '@codemirror/view'
import { yaml as yamlLang } from '@codemirror/lang-yaml'
import { openSearchPanel, search } from '@codemirror/search'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import type { YamlTabState } from '../Layout/BottomPanelContext'

interface YamlEditorPanelBodyProps {
  tab: YamlTabState
  onDone: () => void
}

export function YamlEditorPanelBody({ tab, onDone }: YamlEditorPanelBodyProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const isDark = useResolvedDarkMode()
  const [value, setValue] = useState(tab.initialYaml)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const viewRef = useRef<EditorView | null>(null)

  function handleSearch(): void {
    if (viewRef.current) openSearchPanel(viewRef.current)
  }

  async function handleSave(): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      if (tab.mode === 'create') {
        const res = await window.api.resource.createManifest({ clusterId: tab.clusterId, yaml: value })
        if ('error' in res) {
          if (res.created.length === 0) {
            setError(res.error)
            return
          }
          message.warning(`Created ${res.created.length} resource(s), but: ${res.error}`)
        } else {
          message.success(`Created ${res.created.map((c) => `${c.kind}/${c.name}`).join(', ')}`)
        }
      } else {
        const res = await window.api.resource.applyManifest({ clusterId: tab.clusterId, yaml: value })
        if ('error' in res) {
          setError(res.error)
          return
        }
        message.success(`Saved ${res.ref.kind}/${res.ref.name}`)
      }
      await queryClient.invalidateQueries({ queryKey: tab.listQueryKey })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          flexShrink: 0,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderBottom: '1px solid var(--ml-border-secondary)'
        }}
      >
        <Typography.Text style={{ color: 'var(--ml-text-secondary)', fontSize: 12 }} ellipsis>
          {tab.mode === 'create' ? 'New resource' : `Editing ${tab.name}${tab.namespace ? ` — ${tab.namespace}` : ''}`}
        </Typography.Text>
        <Space>
          {error && (
            <Typography.Text type="danger" style={{ fontSize: 12, maxWidth: 420 }} ellipsis={{ tooltip: error }}>
              {error}
            </Typography.Text>
          )}
          <Button size="small" icon={<SearchOutlined />} onClick={handleSearch}>
            Search
          </Button>
          <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            {tab.mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </Space>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <CodeMirror
          value={value}
          height="100%"
          style={{ height: '100%' }}
          theme={isDark ? githubDark : githubLight}
          extensions={[yamlLang(), search({ top: true })]}
          onChange={setValue}
          onCreateEditor={(view) => {
            viewRef.current = view
          }}
          basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
        />
      </div>
    </div>
  )
}
