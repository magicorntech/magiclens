import { useMemo } from 'react'
import { Drawer, Tabs, Typography } from 'antd'
import { X } from 'lucide-react'
import type { ResourceListItem } from '@shared/types/resource'
import { useLayoutMode } from '../../hooks/useLayoutMode'
import { useResourceManifest } from '../../queries/useResourceManifest'
import { useResourceList } from '../../queries/useResourceList'
import { Icon } from '../ui/Icon'
import { AgeCell } from '../ResourceTable/AgeCell'
import { StatusTag } from '../ResourceTable/StatusTag'
import { ResourceEventsPanel } from '../ResourceTable/ResourceEventsPanel'
import { NodeMetricsPanel } from '../Metrics/NodeMetricsPanel'
import { NodePressurePanel } from '../Metrics/NodePressurePanel'
import { NodeExecPanel } from '../Node/NodeExecPanel'
import { ResizableTable } from '../../utils/ResizableTable'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'

interface NodeInspectorDrawerProps {
  open: boolean
  clusterId: string
  item: ResourceListItem | null
  isActive: boolean
  onClose: () => void
}

interface ParsedNodeManifest {
  labels: Record<string, string>
  annotations: Record<string, string>
  conditions: { type: string; status: string; reason?: string; message?: string }[]
}

function parseNodeManifest(yaml: string): ParsedNodeManifest {
  const labels: Record<string, string> = {}
  const annotations: Record<string, string> = {}
  const conditions: ParsedNodeManifest['conditions'] = []

  const labelsBlock = yaml.match(/^\s{2}labels:\n([\s\S]*?)(?=^\S|^\s{2}\w)/m)
  if (labelsBlock) {
    for (const line of labelsBlock[1].split('\n')) {
      const m = line.match(/^\s+([^:]+):\s*(.+)$/)
      if (m) labels[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }

  const annotationsBlock = yaml.match(/^\s{2}annotations:\n([\s\S]*?)(?=^\S|^\s{2}\w)/m)
  if (annotationsBlock) {
    for (const line of annotationsBlock[1].split('\n')) {
      const m = line.match(/^\s+([^:]+):\s*(.+)$/)
      if (m) annotations[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }

  const conditionBlocks = yaml.matchAll(
    /- type: (\S+)\n\s+status: (\S+)(?:\n\s+reason: (.+))?(?:\n\s+message: (.+))?/g
  )
  for (const match of conditionBlocks) {
    conditions.push({
      type: match[1],
      status: match[2],
      reason: match[3]?.trim(),
      message: match[4]?.trim()
    })
  }

  return { labels, annotations, conditions }
}

export function NodeInspectorDrawer({
  open,
  clusterId,
  item,
  isActive,
  onClose
}: NodeInspectorDrawerProps): React.JSX.Element {
  const layoutMode = useLayoutMode()
  const width = layoutMode === 'mobile' ? '100%' : layoutMode === 'compact' ? 440 : 560
  const { data: yaml, isLoading: manifestLoading } = useResourceManifest(
    clusterId,
    'Nodes',
    item?.name ?? '',
    '',
    open && !!item
  )
  const { data: podsData } = useResourceList(clusterId, 'ALL', 'Pods', isActive && open && !!item)

  const nodePods = useMemo(() => {
    if (!item || !podsData || 'error' in podsData) return []
    return podsData.items.filter((p) => p.columns.node === item.name)
  }, [item, podsData])

  const parsed = useMemo(() => (yaml ? parseNodeManifest(yaml) : null), [yaml])

  const tabItems = item
    ? [
        {
          key: 'overview',
          label: 'Overview',
          children: (
            <div className="ml-node-inspector-pane">
              <dl className="ml-node-inspector-dl">
                <dt>Name</dt>
                <dd>{item.name}</dd>
                <dt>Status</dt>
                <dd>
                  <StatusTag text={item.statusText} color={item.statusColor} detail={item.statusDetail} />
                </dd>
                <dt>Age</dt>
                <dd>
                  <AgeCell timestamp={item.ageTimestamp} />
                </dd>
                <dt>Roles</dt>
                <dd>{item.columns.roles ?? '—'}</dd>
                <dt>Version</dt>
                <dd>{item.columns.version ?? '—'}</dd>
                <dt>Pods</dt>
                <dd>{nodePods.length}</dd>
              </dl>
            </div>
          )
        },
        {
          key: 'metrics',
          label: 'Metrics',
          children: (
            <div className="ml-node-inspector-pane">
              <NodeMetricsPanel clusterId={clusterId} nodeName={item.name} isActive={isActive} />
            </div>
          )
        },
        {
          key: 'pods',
          label: `Pods (${nodePods.length})`,
          children: (
            <div className="ml-node-inspector-pane">
              {nodePods.length === 0 ? (
                <Typography.Text type="secondary">No pods scheduled on this node</Typography.Text>
              ) : (
                <ResizableTable
                  tableKey="node-inspector-pods"
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  dataSource={nodePods}
                  columns={[
                    { title: 'Name', dataIndex: 'name', key: 'name' },
                    { title: 'Namespace', dataIndex: 'namespace', key: 'namespace' },
                    { title: 'Status', key: 'status', render: (_, r) => <StatusTag text={r.statusText} color={r.statusColor} /> },
                    { title: 'Restarts', key: 'restarts', render: (_, r) => r.columns.restarts ?? '0' }
                  ]}
                />
              )}
            </div>
          )
        },
        {
          key: 'conditions',
          label: 'Conditions',
          children: (
            <div className="ml-node-inspector-pane">
              {manifestLoading ? (
                <LoadingState />
              ) : parsed?.conditions.length ? (
                <ul className="ml-node-inspector-conditions">
                  {parsed.conditions.map((c) => (
                    <li key={c.type} className={`ml-node-inspector-condition ml-node-inspector-condition--${c.status.toLowerCase()}`}>
                      <span className="ml-node-inspector-condition-type">{c.type}</span>
                      <span className="ml-node-inspector-condition-status">{c.status}</span>
                      {c.reason && <span className="ml-node-inspector-condition-reason">{c.reason}</span>}
                      {c.message && <span className="ml-node-inspector-condition-message">{c.message}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <Typography.Text type="secondary">No conditions available</Typography.Text>
              )}
            </div>
          )
        },
        {
          key: 'labels',
          label: 'Labels',
          children: (
            <div className="ml-node-inspector-pane">
              <KeyValueList data={parsed?.labels ?? {}} empty="No labels" loading={manifestLoading} />
            </div>
          )
        },
        {
          key: 'annotations',
          label: 'Annotations',
          children: (
            <div className="ml-node-inspector-pane">
              <KeyValueList data={parsed?.annotations ?? {}} empty="No annotations" loading={manifestLoading} />
            </div>
          )
        },
        {
          key: 'events',
          label: 'Events',
          children: (
            <div className="ml-node-inspector-pane">
              <ResourceEventsPanel
                clusterId={clusterId}
                namespace=""
                name={item.name}
                target={{ type: 'builtin', kind: 'Nodes' }}
                isActive={isActive}
              />
            </div>
          )
        },
        {
          key: 'pressure',
          label: 'Pressure',
          children: (
            <div className="ml-node-inspector-pane">
              <NodePressurePanel clusterId={clusterId} nodeName={item.name} isActive={isActive} />
            </div>
          )
        },
        {
          key: 'yaml',
          label: 'YAML',
          children: (
            <div className="ml-node-inspector-pane ml-node-inspector-pane--yaml">
              {manifestLoading || !yaml ? (
                <LoadingState />
              ) : (
                <pre className="ml-node-inspector-yaml">{yaml}</pre>
              )}
            </div>
          )
        },
        {
          key: 'terminal',
          label: 'Terminal',
          children: (
            <div className="ml-node-inspector-pane ml-node-inspector-pane--terminal">
              <NodeExecPanel clusterId={clusterId} nodeName={item.name} isActive={isActive} />
            </div>
          )
        }
      ]
    : []

  return (
    <Drawer
      title={null}
      placement="right"
      open={open && !!item}
      onClose={onClose}
      width={width}
      destroyOnHidden
      className="ml-node-inspector-drawer"
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
      mask={{ blur: true }}
    >
      {item && (
        <div className="ml-node-inspector">
          <header className="ml-node-inspector-header">
            <div>
              <Typography.Text strong style={{ fontSize: 15 }}>{item.name}</Typography.Text>
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Node</Typography.Text>
            </div>
            <button type="button" className="ml-icon-btn" onClick={onClose} aria-label="Close">
              <Icon icon={X} variant="action" />
            </button>
          </header>
          <Tabs size="small" items={tabItems} className="ml-node-inspector-tabs" destroyOnHidden />
        </div>
      )}
    </Drawer>
  )
}

function KeyValueList({
  data,
  empty,
  loading
}: {
  data: Record<string, string>
  empty: string
  loading: boolean
}): React.JSX.Element {
  if (loading) return <LoadingState />
  const entries = Object.entries(data)
  if (entries.length === 0) return <Typography.Text type="secondary">{empty}</Typography.Text>
  return (
    <dl className="ml-node-inspector-kv">
      {entries.map(([k, v]) => (
        <div key={k} className="ml-node-inspector-kv-row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
