import { useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Divider, Input, Modal, Segmented, Space, Spin, Tag, Typography, message } from 'antd'
import { RefreshCw } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { findExistingCluster } from '@shared/clusterIdentity'
import type { ContextInfo, KubeconfigSource } from '@shared/types/kubeconfig'
import { useClusterStore } from '../../stores/clusterStore'

interface AddClusterModalProps {
  open: boolean
  onClose: () => void
}

type Mode = 'file' | 'paste' | 'folder'

interface DiscoveredEntry {
  dedupeKey: string
  context: ContextInfo
  source: KubeconfigSource
  originLabels: string[]
  existingCluster?: { id: string; customName: string }
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

function dedupeKeyForContext(context: ContextInfo): string {
  const server = context.server?.trim().toLowerCase() ?? ''
  const cluster = context.clusterName?.trim().toLowerCase() ?? ''
  return `${context.name.trim().toLowerCase()}::${server || cluster}`
}

export function AddClusterModal({ open, onClose }: AddClusterModalProps): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('file')
  const [yamlText, setYamlText] = useState('')
  const [discovered, setDiscovered] = useState<DiscoveredEntry[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [autoScanning, setAutoScanning] = useState(false)

  const clusters = useClusterStore((s) => s.clusters)
  const addCluster = useClusterStore((s) => s.addCluster)

  function lookupExisting(context: ContextInfo, source: KubeconfigSource): DiscoveredEntry['existingCluster'] | undefined {
    const match = findExistingCluster(
      clusters,
      { contextName: context.name, source },
      context.server
    )
    if (!match) return undefined
    return { id: match.id, customName: match.customName }
  }

  function addDiscovered(contexts: ContextInfo[], source: KubeconfigSource, originLabel: string): void {
    setDiscovered((prev) => {
      const next = [...prev]
      const newKeys: string[] = []

      for (const context of contexts) {
        const dedupeKey = dedupeKeyForContext(context)
        const existingCluster = lookupExisting(context, source)
        const existingIdx = next.findIndex((e) => e.dedupeKey === dedupeKey)

        if (existingIdx >= 0) {
          const entry = next[existingIdx]
          if (!entry.originLabels.includes(originLabel)) {
            next[existingIdx] = {
              ...entry,
              originLabels: [...entry.originLabels, originLabel]
            }
          }
          continue
        }

        next.push({
          dedupeKey,
          context,
          source,
          originLabels: [originLabel],
          existingCluster
        })
        if (!existingCluster) newKeys.push(dedupeKey)
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
    const selectable = discovered.filter((e) => !e.existingCluster).map((e) => e.dedupeKey)
    setSelectedKeys(checked ? new Set(selectable) : new Set())
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
    const entries = discovered.filter((e) => selectedKeys.has(e.dedupeKey) && !e.existingCluster)
    if (entries.length === 0) {
      message.warning('Selected clusters are already in your list.')
      return
    }
    setError(null)
    setBusy(true)

    let skipped = 0

    try {
      for (const entry of entries) {
        const clusterId = crypto.randomUUID()
        const persisted = {
          id: clusterId,
          customName: entry.context.name,
          contextName: entry.context.name,
          source: entry.source,
          isFavorite: false,
          selectedNamespace: 'ALL',
          selectedResourceKind: 'Pods' as const
        }

        const storeRes = await window.api.clusterStore.add(persisted)
        if (!storeRes.ok && storeRes.reason === 'duplicate') {
          skipped += 1
          continue
        }

        addCluster({
          ...persisted,
          status: 'idle',
          openResourceKinds: ['Pods'],
          resourceFocus: null,
          pendingNavigation: null
        })
      }

      if (skipped > 0) {
        message.info(`${skipped} cluster${skipped === 1 ? '' : 's'} skipped — already in your list.`)
      }
      if (entries.length - skipped > 0) {
        message.success(`Added ${entries.length - skipped} cluster${entries.length - skipped === 1 ? '' : 's'}.`)
      }

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const selectable = discovered.filter((e) => !e.existingCluster)
  const existingCount = discovered.length - selectable.length
  const mergedCount = discovered.filter((e) => e.originLabels.length > 1).length
  const allSelected = selectable.length > 0 && selectedKeys.size === selectable.length

  return (
    <Modal title="Add Cluster" open={open} onCancel={handleClose} footer={null} destroyOnHidden width={520}>
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Text strong>Detected on this machine</Typography.Text>
            <Button
              size="small"
              type="text"
              icon={<Icon icon={RefreshCw} variant="detail" />}
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
            <Typography.Text strong>
              {discovered.length} unique context{discovered.length === 1 ? '' : 's'}
              {mergedCount > 0 ? ` (${mergedCount} merged from duplicate configs)` : ''}
              {existingCount > 0
                ? ` — ${existingCount} already in your cluster list`
                : ' — select contexts to add'}
            </Typography.Text>
            {selectable.length > 0 ? (
              <div style={{ margin: '8px 0' }}>
                <Checkbox checked={allSelected} onChange={(e) => toggleAll(e.target.checked)}>
                  Select all new
                </Checkbox>
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
              {discovered.map((entry) => {
                const isExisting = !!entry.existingCluster
                const origins = entry.originLabels.join(', ')
                return (
                  <Checkbox
                    key={entry.dedupeKey}
                    checked={!isExisting && selectedKeys.has(entry.dedupeKey)}
                    disabled={isExisting}
                    onChange={(e) => toggleKey(entry.dedupeKey, e.target.checked)}
                    style={{ padding: '4px 0' }}
                  >
                    <Space orientation="vertical" size={0}>
                      <Space size={8}>
                        <Typography.Text type={isExisting ? 'secondary' : undefined}>
                          {entry.context.name}
                        </Typography.Text>
                        {entry.originLabels.length > 1 ? (
                          <Tag color="processing">Merged</Tag>
                        ) : null}
                        {isExisting ? (
                          <Tag color="default">Already added</Tag>
                        ) : null}
                      </Space>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {entry.context.clusterName}
                        {entry.context.server ? ` · ${entry.context.server}` : ''}
                        {' · '}
                        {origins}
                        {isExisting ? ` · matches "${entry.existingCluster!.customName}"` : ''}
                      </Typography.Text>
                    </Space>
                  </Checkbox>
                )
              })}
            </div>
          </div>
        )}

        {error && <Alert type="error" message={error} showIcon />}

        {selectable.length > 0 && (
          <Button type="primary" block onClick={handleAddSelected} loading={busy} disabled={selectedKeys.size === 0}>
            Add {selectedKeys.size} cluster{selectedKeys.size === 1 ? '' : 's'}
          </Button>
        )}

        {discovered.length > 0 && selectable.length === 0 && (
          <Alert
            type="info"
            showIcon
            message="All detected contexts are already in your cluster list."
          />
        )}
      </Space>
    </Modal>
  )
}
