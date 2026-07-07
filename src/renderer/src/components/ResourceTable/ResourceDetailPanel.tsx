import { Button, Descriptions, Tabs, Tag, Typography, theme } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { ResourceKind } from '@shared/resourceKinds'
import { isPodDetailData } from '@shared/types/pod'
import type { PodContainerInfo } from '@shared/types/pod'
import type { ResourceListItem } from '@shared/types/resource'
import { kindColumnDefs } from '../../resourceConfig/kinds.renderer'
import { usePodDetail } from '../../queries/usePodDetail'
import { AgeCell } from './AgeCell'
import { StatusTag } from './StatusTag'
import { IngressHostsCell } from './IngressHostsCell'
import { ResourceEventsPanel } from './ResourceEventsPanel'
import { PodMetricsPanel } from '../Pod/PodMetricsPanel'
import { PodNetworkPanel } from '../Pod/PodNetworkPanel'
import { PodLogsPanel } from '../Pod/PodLogsPanel'
import { PodExecPanel } from '../Pod/PodExecPanel'
import { ServicePortForwardPanel } from '../Pod/ServicePortForwardPanel'
import { NodeMetricsPanel } from '../Metrics/NodeMetricsPanel'
import { NodePressurePanel } from '../Metrics/NodePressurePanel'
import { WorkloadReplicaHistoryPanel } from '../Metrics/WorkloadReplicaHistoryPanel'
import { NodeExecPanel } from '../Node/NodeExecPanel'
import { LoadingState } from './EmptyErrorStates'
import { WorkloadDetailToolbar } from '../Workload/WorkloadDetailToolbar'
import { isWorkloadKind } from '@shared/types/workload'
import { ResizableTable } from '../../utils/ResizableTable'

interface ResourceDetailPanelProps {
  clusterId: string
  kind: ResourceKind
  item: ResourceListItem
  isActive: boolean
  layout?: 'sidebar' | 'bottom'
  listQueryKey?: unknown[]
  onClose: () => void
}

const podContainerColumns: ColumnsType<PodContainerInfo> = [
  { title: 'Container', dataIndex: 'name', key: 'name' },
  {
    title: 'State',
    key: 'state',
    render: (_, c) => (
      <div>
        <Tag color={c.state === 'Running' ? 'green' : c.state === 'Waiting' ? 'gold' : 'red'}>{c.state}</Tag>
        {c.stateMessage ? (
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
            {c.stateMessage}
          </Typography.Text>
        ) : null}
        {c.lastTerminatedReason ? (
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            Last: {c.lastTerminatedReason}
          </Typography.Text>
        ) : null}
      </div>
    )
  },
  {
    title: 'Ready',
    dataIndex: 'ready',
    key: 'ready',
    width: 70,
    render: (v: boolean) => (v ? 'Yes' : 'No')
  },
  { title: 'Restarts', dataIndex: 'restartCount', key: 'restartCount', width: 80 },
  { title: 'Image', dataIndex: 'image', key: 'image', ellipsis: true }
]

export function ResourceDetailPanel({
  clusterId,
  kind,
  item,
  isActive,
  layout = 'sidebar',
  listQueryKey,
  onClose
}: ResourceDetailPanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const isPod = kind === 'Pods'
  const isService = kind === 'Services'
  const isNode = kind === 'Nodes'
  const isDeployment = kind === 'Deployments'
  const isHpa = kind === 'HorizontalPodAutoscalers'
  const { data: podDetail, isLoading: podDetailLoading } = usePodDetail(
    clusterId,
    item.namespace,
    item.name,
    isActive && isPod
  )

  const statusDisplay =
    isPod && isPodDetailData(podDetail)
      ? {
          text: podDetail.statusText,
          color: podDetail.statusColor,
          detail: podDetail.statusDetail
        }
      : {
          text: item.statusText,
          color: item.statusColor,
          detail: item.statusDetail
        }

  const overview = (
    <>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="Name">{item.name}</Descriptions.Item>
        {item.namespace ? <Descriptions.Item label="Namespace">{item.namespace}</Descriptions.Item> : null}
        <Descriptions.Item label="Status">
          <StatusTag text={statusDisplay.text} color={statusDisplay.color} detail={statusDisplay.detail} />
        </Descriptions.Item>
        <Descriptions.Item label="Age">
          <AgeCell timestamp={item.ageTimestamp} />
        </Descriptions.Item>
        {kindColumnDefs[kind]
          .filter((col) => col.key !== 'tlsHosts')
          .map((col) => (
            <Descriptions.Item key={col.key} label={col.title}>
              {kind === 'Ingresses' && col.key === 'hosts' ? (
                <IngressHostsCell hosts={item.columns.hosts} tlsHosts={item.columns.tlsHosts} />
              ) : (
                (item.columns[col.key] ?? '-')
              )}
            </Descriptions.Item>
          ))}
      </Descriptions>
      {isPod && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            Containers
          </Typography.Text>
          {podDetailLoading ? (
            <LoadingState />
          ) : !isPodDetailData(podDetail) ? (
            <Typography.Text type="danger">
              {podDetail && 'error' in podDetail ? podDetail.error : 'Failed to load pod details'}
            </Typography.Text>
          ) : (
            <ResizableTable
              tableKey="pod-containers"
              rowKey="name"
              columns={podContainerColumns}
              dataSource={podDetail.containers}
              pagination={false}
              size="small"
            />
          )}
        </div>
      )}
    </>
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

  const tabItems = [
    { key: 'overview', label: 'Overview', children: paddedPane(overview) },
    {
      key: 'events',
      label: 'Events',
      children: paddedPane(
        <ResourceEventsPanel
          clusterId={clusterId}
          namespace={item.namespace}
          name={item.name}
          target={{ type: 'builtin', kind }}
          isActive={isActive}
        />
      )
    },
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
              <PodMetricsPanel
                clusterId={clusterId}
                namespace={item.namespace}
                podName={item.name}
                podUid={item.id}
                ageTimestamp={item.ageTimestamp}
                isActive={isActive}
              />
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
    ...(isDeployment || isHpa
      ? [
          {
            key: 'replica-history',
            label: 'Replica history',
            children: paddedPane(
              <WorkloadReplicaHistoryPanel
                clusterId={clusterId}
                namespace={item.namespace}
                resourceName={item.name}
                kind={kind as 'Deployments' | 'HorizontalPodAutoscalers'}
                isActive={isActive}
              />
            )
          }
        ]
      : []),
    ...(isNode
      ? [
          {
            key: 'exec',
            label: 'Exec',
            children: fullBleedPane(
              <NodeExecPanel clusterId={clusterId} nodeName={item.name} isActive={isActive} />
            )
          },
          {
            key: 'metrics',
            label: 'Metrics',
            children: paddedPane(<NodeMetricsPanel clusterId={clusterId} nodeName={item.name} isActive={isActive} />)
          },
          {
            key: 'pressure',
            label: 'Pressure',
            children: paddedPane(
              <NodePressurePanel clusterId={clusterId} nodeName={item.name} isActive={isActive} />
            )
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
        borderLeft: layout === 'sidebar' ? `1px solid ${token.colorBorderSecondary}` : undefined
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
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isWorkloadKind(kind) && listQueryKey ? (
          <div style={{ flexShrink: 0, padding: '8px 16px 0' }}>
            <WorkloadDetailToolbar
              clusterId={clusterId}
              kind={kind}
              namespace={item.namespace}
              name={item.name}
              target={{ type: 'builtin', kind }}
              listQueryKey={listQueryKey}
            />
          </div>
        ) : null}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Tabs size="small" items={tabItems} style={{ height: '100%' }} tabBarStyle={{ margin: '0 16px' }} destroyOnHidden />
        </div>
      </div>
    </div>
  )
}
