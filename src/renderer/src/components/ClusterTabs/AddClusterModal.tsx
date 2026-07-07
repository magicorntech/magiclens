import { useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Divider, Input, Modal, Segmented, Space, Spin, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ContextInfo, KubeconfigSource } from '@shared/types/kubeconfig'
import { useClusterStore } from '../../stores/clusterStore'

interface AddClusterModalProps {
  open: boolean
  onClose: () => void
}

type Mode = 'file' | 'paste' | 'folder'

interface DiscoveredEntry {
  key: string
  context: ContextInfo
  source: KubeconfigSource
  originLabel: string
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

function entryKey(source: KubeconfigSource, contextName: string): string {
  const sourceKey = source.type === 'file' ? source.filePath : 'pasted-yaml'
  return `${sourceKey}::${contextName}`
}

export function AddClusterModal({ open, onClose }: AddClusterModalProps): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('file')
  const [yamlText, setYamlText] = useState('')
  const [discovered, setDiscovered] = useState<DiscoveredEntry[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [autoScanning, setAutoScanning] = useState(false)

  const addCluster = useClusterStore((s) => s.addCluster)

  function addDiscovered(contexts: ContextInfo[], source: KubeconfigSource, originLabel: string): void {
    setDiscovered((prev) => {
      const next = [...prev]
      const newKeys: string[] = []
      for (const context of contexts) {
        const key = entryKey(source, context.name)
        if (!next.some((e) => e.key === key)) {
          next.push({ key, context, source, originLabel })
          newKeys.push(key)
        }
      }
      if (newKeys.length > 0) {
        setSelectedKeys((prevSelected) => new Set([...prevSelected, ...newKeys]))
      }
      return next
    })
  }

  async function runDefaultScan(): Promise<void> {
    setAutoScanning(true)
    try {
      const result = await window.api.kubeconfig.scanDefault()
      for (const file of result.files) {
        addDiscovered(file.contexts, { type: 'file', filePath: file.filePath }, basename(file.filePath))
      }
    } catch {
      // best-effort auto-scan; ignore failures silently
    } finally {
      setAutoScanning(false)
    }
  }

  useEffect(() => {
    if (open) {
      setMode('file')
      setYamlText('')
      setDiscovered([])
      setSelectedKeys(new Set())
      setError(null)
      setBusy(false)
      void runDefaultScan()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleClose(): void {
    onClose()
  }

  function toggleKey(key: string, checked: boolean): void {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function toggleAll(checked: boolean): void {
    setSelectedKeys(checked ? new Set(discovered.map((e) => e.key)) : new Set())
  }

  async function handlePickFile(): Promise<void> {
    setError(null)
    const result = await window.api.kubeconfig.pickFile()
    if (result.canceled || !result.filePath) return
    setBusy(true)
    try {
      const parsed = await window.api.kubeconfig.parseFile({ filePath: result.filePath })
      addDiscovered(parsed.contexts, parsed.source, basename(result.filePath))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleParseYaml(): Promise<void> {
    setError(null)
    setBusy(true)
    try {
      const parsed = await window.api.kubeconfig.parseString({ yaml: yamlText })
      addDiscovered(parsed.contexts, parsed.source, 'Pasted YAML')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handlePickFolder(): Promise<void> {
    setError(null)
    const picked = await window.api.kubeconfig.pickDirectory()
    if (picked.canceled || !picked.directoryPath) return
    setBusy(true)
    try {
      const result = await window.api.kubeconfig.scanDirectory({ directoryPath: picked.directoryPath })
      if (result.files.length === 0) {
        setError(`No kubeconfig files found in ${picked.directoryPath}`)
      }
      for (const file of result.files) {
        addDiscovered(file.contexts, { type: 'file', filePath: file.filePath }, basename(file.filePath))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleAddSelected(): Promise<void> {
    const entries = discovered.filter((e) => selectedKeys.has(e.key))
    if (entries.length === 0) return
    setError(null)
    setBusy(true)

    try {
      for (const entry of entries) {
        const clusterId = crypto.randomUUID()
        addCluster({
          id: clusterId,
          customName: entry.context.name,
          contextName: entry.context.name,
          source: entry.source,
          isFavorite: false,
          status: 'idle',
          selectedNamespace: 'ALL',
          selectedResourceKind: 'Pods',
          openResourceKinds: ['Pods'],
          resourceFocus: null
        })

        await window.api.clusterStore.add({
          id: clusterId,
          customName: entry.context.name,
          contextName: entry.context.name,
          source: entry.source,
          isFavorite: false,
          selectedNamespace: 'ALL',
          selectedResourceKind: 'Pods'
        })
      }

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const allSelected = discovered.length > 0 && selectedKeys.size === discovered.length

  return (
    <Modal title="Add Cluster" open={open} onCancel={handleClose} footer={null} destroyOnHidden width={520}>
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Text strong>Detected on this machine</Typography.Text>
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              loading={autoScanning}
              onClick={runDefaultScan}
            >
              Rescan ~/.kube
            </Button>
          </Space>
          {autoScanning && discovered.length === 0 && <Spin size="small" />}
        </div>

        <Segmented
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { label: 'Pick kubeconfig file', value: 'file' },
            { label: 'Paste kubeconfig YAML', value: 'paste' },
            { label: 'Scan a folder', value: 'folder' }
          ]}
          block
        />

        {mode === 'file' && (
          <Button onClick={handlePickFile} loading={busy}>
            Choose file...
          </Button>
        )}

        {mode === 'paste' && (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Input.TextArea
              rows={8}
              value={yamlText}
              onChange={(e) => setYamlText(e.target.value)}
              placeholder="Paste kubeconfig YAML here"
            />
            <Button onClick={handleParseYaml} loading={busy} disabled={!yamlText.trim()}>
              Parse
            </Button>
          </Space>
        )}

        {mode === 'folder' && (
          <Button onClick={handlePickFolder} loading={busy}>
            Choose folder to scan...
          </Button>
        )}

        {discovered.length > 0 && (
          <div>
            <Divider style={{ margin: '12px 0' }} />
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Typography.Text strong>
                {discovered.length} context{discovered.length === 1 ? '' : 's'} found — all will be added as
                not-yet-connected clusters. You can connect each one later.
              </Typography.Text>
            </Space>
            <div style={{ margin: '8px 0' }}>
              <Checkbox checked={allSelected} onChange={(e) => toggleAll(e.target.checked)}>
                Select all
              </Checkbox>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
              {discovered.map((entry) => (
                <Checkbox
                  key={entry.key}
                  checked={selectedKeys.has(entry.key)}
                  onChange={(e) => toggleKey(entry.key, e.target.checked)}
                  style={{ padding: '4px 0' }}
                >
                  <Space orientation="vertical" size={0}>
                    <Typography.Text>{entry.context.name}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {entry.context.clusterName} · {entry.originLabel}
                    </Typography.Text>
                  </Space>
                </Checkbox>
              ))}
            </div>
          </div>
        )}

        {error && <Alert type="error" message={error} showIcon />}

        {discovered.length > 0 && (
          <Button type="primary" block onClick={handleAddSelected} loading={busy} disabled={selectedKeys.size === 0}>
            Add {selectedKeys.size} cluster{selectedKeys.size === 1 ? '' : 's'}
          </Button>
        )}
      </Space>
    </Modal>
  )
}
