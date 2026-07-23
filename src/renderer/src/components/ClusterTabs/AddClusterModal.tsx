import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Input,
  Modal,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  message
} from 'antd'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui/Icon'
import { findExistingCluster } from '@shared/clusterIdentity'
import type { ContextInfo, KubeconfigSource } from '@shared/types/kubeconfig'
import { useClusterStore } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { applyDedupeResult } from '../../clusterDedupe'

interface AddClusterModalProps {
  open: boolean
  onClose: () => void
}

type Mode = 'file' | 'paste' | 'folder'
type DuplicateAction = 'skip' | 'rename'

interface DiscoveredEntry {
  dedupeKey: string
  context: ContextInfo
  source: KubeconfigSource
  originLabels: string[]
  existingCluster?: { id: string; customName: string }
  duplicateAction: DuplicateAction
  customName: string
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

function dedupeKeyForContext(context: ContextInfo): string {
  const server = context.server?.trim().toLowerCase() ?? ''
  const cluster = context.clusterName?.trim().toLowerCase() ?? ''
  const auth = context.authFingerprint?.trim() ?? ''
  return `${context.name.trim().toLowerCase()}::${server || cluster}::${auth}`
}

export function AddClusterModal({ open, onClose }: AddClusterModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('file')
  const [yamlText, setYamlText] = useState('')
  const [discovered, setDiscovered] = useState<DiscoveredEntry[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [autoScanning, setAutoScanning] = useState(false)
  const [scanPathLabel, setScanPathLabel] = useState('~/.kube')

  const clusters = useClusterStore((s) => s.clusters)
  const addCluster = useClusterStore((s) => s.addCluster)
  const kubeconfigScanPath = useDisplaySettingsStore((s) => s.kubeconfigScanPath)

  function lookupExisting(context: ContextInfo, source: KubeconfigSource): DiscoveredEntry['existingCluster'] | undefined {
    const match = findExistingCluster(
      clusters,
      {
        contextName: context.name,
        source,
        endpoint: context.server,
        customName: context.name,
        authFingerprint: context.authFingerprint
      },
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
          existingCluster,
          duplicateAction: 'skip',
          customName: context.name
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
      setScanPathLabel(result.directoryPath)
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
      setScanPathLabel(kubeconfigScanPath.trim() || '~/.kube')
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

  function updateEntry(key: string, patch: Partial<DiscoveredEntry>): void {
    setDiscovered((prev) => prev.map((e) => (e.dedupeKey === key ? { ...e, ...patch } : e)))
  }

  function toggleAll(checked: boolean): void {
    const selectable = discovered
      .filter((e) => !e.existingCluster || e.duplicateAction === 'rename')
      .map((e) => e.dedupeKey)
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
    const entries = discovered.filter((e) => {
      if (!selectedKeys.has(e.dedupeKey)) return false
      if (!e.existingCluster) return true
      return e.duplicateAction === 'rename' && e.customName.trim().length > 0
    })
    if (entries.length === 0) {
      message.warning(t('addCluster.noneToAdd'))
      return
    }
    setError(null)
    setBusy(true)

    let skipped = 0
    let added = 0

    try {
      for (const entry of entries) {
        const force = !!entry.existingCluster && entry.duplicateAction === 'rename'
        const clusterId = crypto.randomUUID()
        const persisted = {
          id: clusterId,
          customName: entry.customName.trim() || entry.context.name,
          contextName: entry.context.name,
          source: entry.source,
          endpoint: entry.context.server,
          authFingerprint: entry.context.authFingerprint,
          isFavorite: false,
          selectedNamespace: 'ALL',
          selectedResourceKind: 'Pods' as const
        }

        const storeRes = await window.api.clusterStore.add(persisted, force ? { force: true } : undefined)
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
        added += 1
      }

      if (skipped > 0) {
        message.info(t('addCluster.skipped', { count: skipped }))
      }
      if (added > 0) {
        message.success(t('addCluster.added', { count: added }))
      }

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleMergeDuplicates(): Promise<void> {
    setBusy(true)
    try {
      const result = await window.api.clusterStore.dedupe()
      applyDedupeResult(result)
      if (result.groupsMerged === 0) {
        message.info(t('addCluster.mergeNone'))
      } else {
        message.success(
          t('addCluster.mergeDone', {
            groups: result.groupsMerged,
            removed: result.removedIds.length
          })
        )
      }
      setDiscovered((prev) =>
        prev.map((entry) => {
          const match = lookupExisting(entry.context, entry.source)
          return {
            ...entry,
            existingCluster: match,
            duplicateAction: match ? entry.duplicateAction : 'skip'
          }
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const selectable = discovered.filter((e) => !e.existingCluster || e.duplicateAction === 'rename')
  const existingCount = discovered.filter((e) => e.existingCluster).length
  const mergedCount = discovered.filter((e) => e.originLabels.length > 1).length
  const allSelected = selectable.length > 0 && selectable.every((e) => selectedKeys.has(e.dedupeKey))

  return (
    <Modal title={t('addCluster.title')} open={open} onCancel={handleClose} footer={null} destroyOnHidden width={560}>
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Typography.Text strong>{t('addCluster.detected')}</Typography.Text>
            <Space size={4}>
              <Button size="small" onClick={() => void handleMergeDuplicates()} loading={busy}>
                {t('addCluster.mergeExisting')}
              </Button>
              <Button
                size="small"
                type="text"
                icon={<Icon icon={RefreshCw} variant="detail" />}
                loading={autoScanning}
                onClick={() => void runDefaultScan()}
              >
                {t('addCluster.rescan')}
              </Button>
            </Space>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            {t('addCluster.scanPath', { path: scanPathLabel })}
          </Typography.Text>
          {autoScanning && discovered.length === 0 && <Spin size="small" />}
        </div>

        <Segmented
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { label: t('addCluster.modeFile'), value: 'file' },
            { label: t('addCluster.modePaste'), value: 'paste' },
            { label: t('addCluster.modeFolder'), value: 'folder' }
          ]}
          block
        />

        {mode === 'file' && (
          <Button onClick={() => void handlePickFile()} loading={busy}>
            {t('addCluster.chooseFile')}
          </Button>
        )}

        {mode === 'paste' && (
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Input.TextArea
              rows={8}
              value={yamlText}
              onChange={(e) => setYamlText(e.target.value)}
              placeholder={t('addCluster.pastePlaceholder')}
            />
            <Button onClick={() => void handleParseYaml()} loading={busy} disabled={!yamlText.trim()}>
              {t('addCluster.parse')}
            </Button>
          </Space>
        )}

        {mode === 'folder' && (
          <Button onClick={() => void handlePickFolder()} loading={busy}>
            {t('addCluster.chooseFolder')}
          </Button>
        )}

        {discovered.length > 0 && (
          <div>
            <Divider style={{ margin: '12px 0' }} />
            <Typography.Text strong>
              {t('addCluster.uniqueContexts', { count: discovered.length })}
              {mergedCount > 0 ? ` ${t('addCluster.mergedHint', { count: mergedCount })}` : ''}
              {existingCount > 0 ? ` — ${t('addCluster.alreadyInList', { count: existingCount })}` : ''}
            </Typography.Text>
            {selectable.length > 0 ? (
              <div style={{ margin: '8px 0' }}>
                <Checkbox checked={allSelected} onChange={(e) => toggleAll(e.target.checked)}>
                  {t('addCluster.selectAllNew')}
                </Checkbox>
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {discovered.map((entry) => {
                const isExisting = !!entry.existingCluster
                const canSelect = !isExisting || entry.duplicateAction === 'rename'
                const origins = entry.originLabels.join(', ')
                return (
                  <div key={entry.dedupeKey} style={{ padding: '6px 0', borderBottom: '1px solid var(--ant-color-split, #f0f0f0)' }}>
                    <Checkbox
                      checked={canSelect && selectedKeys.has(entry.dedupeKey)}
                      disabled={!canSelect}
                      onChange={(e) => toggleKey(entry.dedupeKey, e.target.checked)}
                    >
                      <Space orientation="vertical" size={0}>
                        <Space size={8} wrap>
                          <Typography.Text type={!canSelect ? 'secondary' : undefined}>
                            {entry.context.name}
                          </Typography.Text>
                          {entry.originLabels.length > 1 ? (
                            <Tag color="processing">{t('addCluster.tagMerged')}</Tag>
                          ) : null}
                          {isExisting ? <Tag color="default">{t('addCluster.tagAlready')}</Tag> : null}
                        </Space>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {entry.context.clusterName}
                          {entry.context.server ? ` · ${entry.context.server}` : ''}
                          {' · '}
                          {origins}
                          {isExisting ? ` · ${t('addCluster.matches', { name: entry.existingCluster!.customName })}` : ''}
                        </Typography.Text>
                      </Space>
                    </Checkbox>
                    {isExisting && (
                      <div style={{ marginLeft: 24, marginTop: 6 }}>
                        <Segmented
                          size="small"
                          value={entry.duplicateAction}
                          onChange={(v) => {
                            const action = v as DuplicateAction
                            updateEntry(entry.dedupeKey, { duplicateAction: action })
                            if (action === 'rename') {
                              setSelectedKeys((prev) => new Set([...prev, entry.dedupeKey]))
                            } else {
                              setSelectedKeys((prev) => {
                                const next = new Set(prev)
                                next.delete(entry.dedupeKey)
                                return next
                              })
                            }
                          }}
                          options={[
                            { label: t('addCluster.dupSkip'), value: 'skip' },
                            { label: t('addCluster.dupRename'), value: 'rename' }
                          ]}
                        />
                        {entry.duplicateAction === 'rename' && (
                          <Input
                            size="small"
                            style={{ marginTop: 6, maxWidth: 280 }}
                            value={entry.customName}
                            onChange={(e) => updateEntry(entry.dedupeKey, { customName: e.target.value })}
                            placeholder={t('addCluster.newNamePlaceholder')}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {error && <Alert type="error" message={error} showIcon />}

        {selectable.length > 0 && (
          <Button
            type="primary"
            block
            onClick={() => void handleAddSelected()}
            loading={busy}
            disabled={selectedKeys.size === 0}
          >
            {t('addCluster.addCount', { count: selectedKeys.size })}
          </Button>
        )}

        {discovered.length > 0 && selectable.length === 0 && (
          <Alert type="info" showIcon message={t('addCluster.allAlready')} />
        )}
      </Space>
    </Modal>
  )
}
