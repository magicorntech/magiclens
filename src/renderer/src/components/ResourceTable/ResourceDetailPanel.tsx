import { Button, Descriptions, Tabs, Typography, theme } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { kindColumnDefs } from '../../resourceConfig/kinds.renderer'
import { AgeCell } from './AgeCell'
import { StatusTag } from './StatusTag'
import { PodMetricsPanel } from '../Pod/PodMetricsPanel'
import { PodNetworkPanel } from '../Pod/PodNetworkPanel'
import { PodLogsPanel } from '../Pod/PodLogsPanel'
import { PodExecPanel } from '../Pod/PodExecPanel'
import { ServicePortForwardPanel } from '../Pod/ServicePortForwardPanel'
import { NodeMetricsPanel } from '../Metrics/NodeMetricsPanel'

interface ResourceDetailPanelProps {
  clusterId: string
  kind: ResourceKind
  item: ResourceListItem
  isActive: boolean
  onClose: () => void
}

export function ResourceDetailPanel({
  clusterId,
  kind,
  item,
  isActive,
  onClose
}: ResourceDetailPanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const isPod = kind === 'Pods'
  const isService = kind === 'Services'
  const isNode = kind === 'Nodes'

  const overview = (
    <Descriptions bordered size="small" column={1}>
      <Descriptions.Item label="Name">{item.name}</Descriptions.Item>
      {item.namespace ? <Descriptions.Item label="Namespace">{item.namespace}</Descriptions.Item> : null}
      <Descriptions.Item label="Status">
        <StatusTag text={item.statusText} color={item.statusColor} />
      </Descriptions.Item>
      <Descriptions.Item label="Age">
        <AgeCell timestamp={item.ageTimestamp} />
      </Descriptions.Item>
      {kindColumnDefs[kind].map((col) => (
        <Descriptions.Item key={col.key} label={col.title}>
          {item.columns[col.key] ?? '-'}
        </Descriptions.Item>
      ))}
    </Descriptions>
  )

  const properties = (
    <pre
      style={{
        margin: 0,
        padding: 12,
        borderRadius: token.borderRadius,
        background: token.colorFillAlter,
        fontSize: 12,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}
    >
      {JSON.stringify(item, null, 2)}
    </pre>
  )

  const paddedPane = (content: React.ReactNode): React.ReactNode => (
    <div style={{ height: '100%', overflow: 'auto', padding: 16, boxSizing: 'border-box' }}>{content}</div>
  )

  const fullBleedPane = (content: React.ReactNode): React.ReactNode => (
    <div style={{ height: '100%', overflow: 'hidden', padding: 12, boxSizing: 'border-box' }}>{content}</div>
  )

  const items = [
    { key: 'overview', label: 'Overview', children: paddedPane(overview) },
    ...(isPod
      ? [
          {
            key: 'logs',
            label: 'Logs',
            children: fullBleedPane(
              <PodLogsPanel clusterId={clusterId} namespace={item.namespace} podName={item.name} isActive={isActive} />
            )
          },
          {
            key: 'exec',
            label: 'Exec',
            children: fullBleedPane(
              <PodExecPanel clusterId={clusterId} namespace={item.namespace} podName={item.name} isActive={isActive} />
            )
          },
          {
            key: 'metrics',
            label: 'Metrics',
            children: paddedPane(
              <PodMetricsPanel clusterId={clusterId} namespace={item.namespace} podName={item.name} isActive={isActive} />
            )
          },
          {
            key: 'network',
            label: 'Network',
            children: paddedPane(
              <PodNetworkPanel clusterId={clusterId} namespace={item.namespace} podName={item.name} isActive={isActive} />
            )
          }
        ]
      : []),
    ...(isService
      ? [
          {
            key: 'port-forward',
            label: 'Port Forward',
            children: paddedPane(
              <ServicePortForwardPanel
                clusterId={clusterId}
                namespace={item.namespace}
                serviceName={item.name}
                isActive={isActive}
              />
            )
          }
        ]
      : []),
    ...(isNode
      ? [
          {
            key: 'metrics',
            label: 'Metrics',
            children: paddedPane(<NodeMetricsPanel clusterId={clusterId} nodeName={item.name} isActive={isActive} />)
          }
        ]
      : []),
    { key: 'properties', label: 'Properties', children: paddedPane(properties) }
  ]

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: token.colorBgContainer,
        borderLeft: `1px solid ${token.colorBorderSecondary}`
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '12px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <Typography.Text strong>{item.name}</Typography.Text>
          {item.namespace ? (
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              {item.namespace}
            </Typography.Text>
          ) : null}
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Tabs size="small" items={items} style={{ height: '100%' }} tabBarStyle={{ margin: '0 16px' }} destroyOnHidden />
      </div>
    </div>
  )
}
