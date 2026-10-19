import { useMemo, useState } from 'react'
import { Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import type { TopologyGraphResponse, TopologyHealth, TopologyNode, TopologyNodeKind } from '@shared/types/topology'
import { topologyNodeAge } from './topologyInsights'
import { topologyToResourceKind } from './topologyResource'
import { ResourceRowActions } from '../ResourceTable/ResourceRowActions'
import { compareAgeTimestamps, compareText } from '../../utils/tableSort'
import { useTablePageSizeStore } from '../../stores/tablePageSizeStore'

interface TopologyResourcePanelProps {
  clusterId: string
  graph: TopologyGraphResponse
  onSelectNode: (node: TopologyNode) => void
}

const PANEL_KINDS: TopologyNodeKind[] = ['Deployment', 'StatefulSet', 'Service', 'Ingress', 'ConfigMap']

export function TopologyResourcePanel({
  clusterId,
  graph,
  onSelectNode
}: TopologyResourcePanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const pageSize = useTablePageSizeStore((s) => s.pageSize)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<TopologyNodeKind | 'ALL'>('ALL')
  const [health, setHealth] = useState<TopologyHealth | 'ALL'>('ALL')
  const [sort, setSort] = useState<'name' | 'kind' | 'health'>('name')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = graph.nodes.filter((n) => PANEL_KINDS.includes(n.kind))
    if (kind !== 'ALL') list = list.filter((n) => n.kind === kind)
    if (health !== 'ALL') list = list.filter((n) => n.status === health)
    if (q) {
      list = list.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.namespace.toLowerCase().includes(q) ||
          Object.entries(n.labels ?? {})
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')
            .toLowerCase()
            .includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      if (sort === 'kind') return a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)
      if (sort === 'health') return a.status.localeCompare(b.status) || a.name.localeCompare(b.name)
      return a.name.localeCompare(b.name)
    })
    return list
  }, [graph.nodes, query, kind, health, sort])

  const columns: ColumnsType<TopologyNode> = [
    {
      title: t('topology.sortName'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => compareText(a.name, b.name),
      render: (name: string, row) => (
        <Space orientation="vertical" size={0}>
          <Typography.Link onClick={() => onSelectNode(row)}>{name}</Typography.Link>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {row.namespace}
          </Typography.Text>
        </Space>
      )
    },
    {
      title: t('topology.filterKind'),
      dataIndex: 'kind',
      key: 'kind',
      width: 120,
      sorter: (a, b) => compareText(a.kind, b.kind)
    },
    {
      title: t('topology.filterHealth'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      sorter: (a, b) => compareText(a.status, b.status),
      render: (status: TopologyHealth) => <Tag>{t(`topology.health.${status}`)}</Tag>
    },
    {
      title: t('topology.apps.replicas'),
      key: 'replicas',
      width: 100,
      sorter: (a, b) => (a.replicasReady ?? -1) - (b.replicasReady ?? -1),
      render: (_, row) =>
        row.replicasDesired !== undefined ? `${row.replicasReady ?? 0}/${row.replicasDesired}` : '—'
    },
    {
      title: t('topology.apps.uptime'),
      key: 'age',
      width: 80,
      sorter: (a, b) => compareAgeTimestamps(a.ageTimestamp, b.ageTimestamp),
      render: (_, row) => topologyNodeAge(row)
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, row) => {
        const kind = topologyToResourceKind(row.kind)
        if (!kind) return null
        return (
          <ResourceRowActions
            clusterId={clusterId}
            target={{ type: 'builtin', kind }}
            namespace={row.namespace}
            name={row.name}
            itemId={row.id}
            listQueryKey={['topology', clusterId]}
          />
        )
      }
    }
  ]

  return (
    <div className="ml-topo-resources">
      <Space wrap style={{ marginBottom: 12 }}>
        <Input
          allowClear
          placeholder={t('topology.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: 220 }}
        />
        <Select
          value={kind}
          style={{ width: 150 }}
          onChange={setKind}
          options={[
            { value: 'ALL', label: t('topology.filterAll') },
            ...PANEL_KINDS.map((k) => ({ value: k, label: k }))
          ]}
        />
        <Select
          value={health}
          style={{ width: 140 }}
          onChange={setHealth}
          options={[
            { value: 'ALL', label: t('topology.filterAll') },
            { value: 'healthy', label: t('topology.health.healthy') },
            { value: 'degraded', label: t('topology.health.degraded') },
            { value: 'error', label: t('topology.health.error') },
            { value: 'unknown', label: t('topology.health.unknown') }
          ]}
        />
        <Select
          value={sort}
          style={{ width: 140 }}
          onChange={setSort}
          options={[
            { value: 'name', label: t('topology.sortName') },
            { value: 'kind', label: t('topology.sortKind') },
            { value: 'health', label: t('topology.sortHealth') }
          ]}
        />
      </Space>
      <Table
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize, showSizeChanger: false }}
        expandable={{
          expandedRowRender: (row) => (
            <div className="ml-topo-expand">
              <div>
                <Typography.Text type="secondary">Labels: </Typography.Text>
                {row.labels && Object.keys(row.labels).length > 0
                  ? Object.entries(row.labels)
                      .slice(0, 12)
                      .map(([k, v]) => (
                        <Tag key={k} style={{ marginBottom: 4 }}>
                          {k}={v}
                        </Tag>
                      ))
                  : '—'}
              </div>
              {row.healthDetail && (
                <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  {row.healthDetail}
                </Typography.Paragraph>
              )}
              {row.ports && row.ports.length > 0 && (
                <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  {t('topology.edge.ports')}: {row.ports.join(', ')}
                </Typography.Paragraph>
              )}
            </div>
          )
        }}
      />
    </div>
  )
}
