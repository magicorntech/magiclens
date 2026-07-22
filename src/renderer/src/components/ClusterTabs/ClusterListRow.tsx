import { useState } from 'react'
import { Button, List, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd'
import { CheckCircle2, ExternalLink, Pencil, RefreshCw, Star, Trash2 } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { ClusterEntry } from '../../stores/clusterStore'
import { useClusterStore } from '../../stores/clusterStore'
import { useClusterVpnStore } from '../../stores/clusterVpnStore'
import { useResourceList } from '../../queries/useResourceList'
import { connectCluster, disconnectCluster } from '../../clusterConnect'
import { ClusterAvatar } from './ClusterAvatar'
import { ClusterVpnBadge } from './ClusterVpnBadge'
import { ConnectionStatusBadge } from '../ResourceTable/ConnectionStatusBadge'
import { HighlightText } from './ClusterSearchInput'

interface ClusterListRowProps {
  cluster: ClusterEntry
  searchQuery: string
  onEdit: (cluster: ClusterEntry) => void
}

export function ClusterListRow({ cluster, searchQuery, onEdit }: ClusterListRowProps): React.JSX.Element {
  const openClusterTab = useClusterStore((s) => s.openClusterTab)
  const toggleFavorite = useClusterStore((s) => s.toggleFavorite)
  const removeCluster = useClusterStore((s) => s.removeCluster)
  const [testing, setTesting] = useState(false)

  const { data: nodesData } = useResourceList(cluster.status === 'connected' ? cluster.id : null, 'ALL', 'Nodes', false)
  const nodeCount = nodesData && 'items' in nodesData ? nodesData.items.length : undefined

  async function handleTestConnection(): Promise<void> {
    setTesting(true)
    try {
      await connectCluster(cluster.id, cluster.source, cluster.contextName)
    } finally {
      setTesting(false)
    }
  }

  async function handleRemove(): Promise<void> {
    await disconnectCluster(cluster.id)
    await window.api.clusterStore.remove(cluster.id)
    removeCluster(cluster.id)
    const links = { ...useClusterVpnStore.getState().links }
    delete links[cluster.id]
    useClusterVpnStore.setState({ links })
  }

  return (
    <List.Item
      extra={
        <Space orientation="vertical" size={4} align="end" style={{ minWidth: 220 }}>
          <ConnectionStatusBadge status={cluster.status} errorMessage={cluster.errorMessage} />
          <Space wrap size={4}>
            {cluster.serverVersion && <Tag icon={<Icon icon={CheckCircle2} variant="micro" />}>{cluster.serverVersion}</Tag>}
            {cluster.namespaces && <Tag>{cluster.namespaces.length} namespaces</Tag>}
            {nodeCount !== undefined && <Tag>{nodeCount} nodes</Tag>}
          </Space>
          {cluster.lastOpenedAt && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Last opened {new Date(cluster.lastOpenedAt).toLocaleString()}
            </Typography.Text>
          )}
        </Space>
      }
      actions={[
        <Tooltip title={cluster.isFavorite ? 'Unfavorite' : 'Favorite'} key="fav">
          <Button
            type="text"
            icon={
              <Icon
                icon={Star}
                size={14}
                fill={cluster.isFavorite ? '#faad14' : 'none'}
                color={cluster.isFavorite ? '#faad14' : undefined}
              />
            }
            onClick={() => toggleFavorite(cluster.id)}
          />
        </Tooltip>,
        <Tooltip title="Edit" key="edit">
          <Button type="text" icon={<Icon icon={Pencil} variant="detail" />} onClick={() => onEdit(cluster)} />
        </Tooltip>,
        <Tooltip title="Test connection" key="test">
          <Button type="text" icon={<Icon icon={RefreshCw} variant="detail" />} loading={testing} onClick={handleTestConnection} />
        </Tooltip>,
        <Tooltip title="Open dashboard" key="open">
          <Button type="text" icon={<Icon icon={ExternalLink} variant="detail" />} onClick={() => openClusterTab(cluster.id)} />
        </Tooltip>,
        <Popconfirm
          key="delete"
          title="Remove this cluster?"
          description="This deletes the saved kubeconfig reference. It does not affect the actual cluster."
          onConfirm={handleRemove}
          okText="Remove"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<Icon icon={Trash2} variant="detail" />} />
        </Popconfirm>
      ]}
    >
      <List.Item.Meta
        avatar={<ClusterAvatar logoUrl={cluster.logoUrl} name={cluster.customName} size={40} />}
        title={
          <Space wrap>
            {cluster.origin === 'org' && <Tag color="blue">org</Tag>}
            <ClusterVpnBadge clusterId={cluster.id} />
            <HighlightText text={cluster.customName} query={searchQuery} />
          </Space>
        }
        description={
          <Space orientation="vertical" size={2}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              <HighlightText text={cluster.contextName} query={searchQuery} />
            </Typography.Text>
            {cluster.endpoint && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                <HighlightText text={cluster.endpoint} query={searchQuery} />
              </Typography.Text>
            )}
          </Space>
        }
      />
    </List.Item>
  )
}
