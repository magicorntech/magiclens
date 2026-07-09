import { Button, Descriptions, Empty, Splitter, Tag, Typography, theme } from 'antd'
import { ExternalLink, X } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { ColumnsType } from 'antd/es/table'
import type { HelmManifestResource, HelmRelease } from '@shared/types/helm'
import type { ResourceFocus } from '@shared/types/navigation'
import { useHelmReleaseDetail } from '../../queries/useHelm'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { ResizableTable } from '../../utils/ResizableTable'

interface HelmReleaseDetailPanelProps {
  clusterId: string
  release: HelmRelease
  onClose: () => void
  onNavigateToResource: (focus: ResourceFocus) => void
}

export function HelmReleaseDetailPanel({
  clusterId,
  release,
  onClose,
  onNavigateToResource
}: HelmReleaseDetailPanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const { data, isLoading } = useHelmReleaseDetail(clusterId, release.namespace, release.name, true)
  const detail = data && 'detail' in data ? data.detail : null
  const error = data && 'error' in data ? data.error : null

  const resourceColumns: ColumnsType<HelmManifestResource> = [
    { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 140 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Namespace', dataIndex: 'namespace', key: 'namespace', width: 160 },
    {
      title: '',
      key: 'open',
      width: 72,
      render: (_, resource) => {
        if (!resource.resourceKind) {
          return (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              —
            </Typography.Text>
          )
        }
        const resourceKind = resource.resourceKind
        return (
          <Button
            type="link"
            size="small"
            icon={<Icon icon={ExternalLink} variant="detail" />}
            onClick={(e) => {
              e.stopPropagation()
              onNavigateToResource({
                kind: resourceKind,
                namespace: resource.namespace,
                name: resource.name
              })
            }}
          >
            Open
          </Button>
        )
      }
    }
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
          <Typography.Text strong>{release.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
            {release.namespace}
          </Typography.Text>
        </div>
        <Button type="text" size="small" icon={<Icon icon={X} variant="detail" />} onClick={onClose} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 12 }}>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <Empty description={error} />
        ) : !detail ? (
          <Empty description="Release detail unavailable" />
        ) : (
          <Splitter layout="vertical" style={{ height: '100%' }}>
            <Splitter.Panel defaultSize="45%" min="25%">
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, paddingRight: 8 }}>
                <Descriptions bordered size="small" column={2} style={{ marginBottom: 12, flexShrink: 0 }}>
                  <Descriptions.Item label="Chart">
                    {detail.chartName}-{detail.chartVersion}
                  </Descriptions.Item>
                  <Descriptions.Item label="Revision">{detail.revision}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag>{detail.status}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="App version">{detail.appVersion || '-'}</Descriptions.Item>
                </Descriptions>
                <Typography.Text strong style={{ display: 'block', marginBottom: 8, flexShrink: 0 }}>
                  Values (revision {detail.revision})
                </Typography.Text>
                <pre
                  style={{
                    flex: 1,
                    minHeight: 0,
                    margin: 0,
                    overflow: 'auto',
                    padding: 12,
                    borderRadius: token.borderRadius,
                    background: token.colorFillAlter,
                    fontSize: 12,
                    lineHeight: 1.5
                  }}
                >
                  {detail.valuesYaml}
                </pre>
              </div>
            </Splitter.Panel>
            <Splitter.Panel defaultSize="55%" min="25%">
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, paddingLeft: 8 }}>
                <Typography.Text strong style={{ display: 'block', marginBottom: 8, flexShrink: 0 }}>
                  Resources ({detail.resources.length})
                </Typography.Text>
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  <ResizableTable
                    tableKey="helm-release-resources"
                    rowKey="id"
                    size="small"
                    columns={resourceColumns}
                    dataSource={detail.resources}
                    pagination={false}
                    locale={{ emptyText: 'No resources in manifest' }}
                    onRow={(resource) => ({
                      style: { cursor: resource.resourceKind ? 'pointer' : 'default' },
                      onClick: () => {
                        if (!resource.resourceKind) return
                        onNavigateToResource({
                          kind: resource.resourceKind,
                          namespace: resource.namespace,
                          name: resource.name
                        })
                      }
                    })}
                  />
                </div>
              </div>
            </Splitter.Panel>
          </Splitter>
        )}
      </div>
    </div>
  )
}
