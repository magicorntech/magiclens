import { useEffect, useState } from 'react'
import { Spin, message } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import type { YamlTabState } from '../Layout/BottomPanelContext'
import { refreshNamespaces } from '../../queries/useNamespaces'
import { YamlMonacoEditor } from '../Editor/YamlMonacoEditor'

interface YamlEditorPanelBodyProps {
  tab: YamlTabState
  onDone: () => void
}

export function YamlEditorPanelBody({ tab, onDone }: YamlEditorPanelBodyProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(tab.initialYaml)
  const [loading, setLoading] = useState(tab.mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValue(tab.initialYaml)
    setError(null)

    if (tab.mode !== 'edit' || !tab.target || !tab.name) {
      setLoading(false)
      return
    }

    const resourceName = tab.name
    let cancelled = false
    setLoading(true)

    void (async () => {
      try {
        const res = await window.api.resource.getManifest({
          clusterId: tab.clusterId,
          namespace: tab.namespace,
          name: resourceName,
          target: tab.target!
        })
        if (cancelled) return
        if ('error' in res) {
          setError(res.error)
          message.error(`Failed to load manifest: ${res.error}`)
          return
        }
        if (res.yaml?.trim()) {
          setValue(res.yaml)
        }
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        message.error(`Failed to load manifest: ${msg}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [tab.id, tab.mode, tab.clusterId, tab.namespace, tab.name, tab.target, tab.initialYaml])

  const resourceLabel =
    tab.mode === 'create'
      ? tab.title
      : `${tab.name ?? 'resource'}${tab.namespace ? ` · ${tab.namespace}` : ''}`

  async function handleSave(): Promise<void> {
    if (!value.trim()) {
      setError('Manifest is empty')
      return
    }

    setSaving(true)
    setError(null)
    try {
      let namespaceListChanged = false
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
        namespaceListChanged = res.created.some((c) => c.kind === 'Namespace')
      } else {
        const res = await window.api.resource.applyManifest({ clusterId: tab.clusterId, yaml: value })
        if ('error' in res) {
          setError(res.error)
          return
        }
        message.success(`Saved ${res.ref.kind}/${res.ref.name}`)
        namespaceListChanged = res.ref.kind === 'Namespace'
      }
      await queryClient.invalidateQueries({ queryKey: tab.listQueryKey })
      if (namespaceListChanged) {
        await refreshNamespaces(queryClient, tab.clusterId)
      }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="ml-yaml-editor-loading">
        <Spin tip="Loading manifest…" />
      </div>
    )
  }

  return (
    <div className="ml-yaml-editor-body">
      <YamlMonacoEditor
        key={tab.id}
        value={value}
        onChange={setValue}
        mode={tab.mode}
        resourceLabel={resourceLabel}
        saving={saving}
        error={error}
        onSave={() => void handleSave()}
      />
    </div>
  )
}
