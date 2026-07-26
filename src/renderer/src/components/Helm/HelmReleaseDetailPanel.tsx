import { useEffect, useState } from 'react'
import { Button, Descriptions, Empty, Splitter, Tabs, Tag, Typography, theme } from 'antd'
import { ExternalLink, X } from 'lucide-react'
import { Icon } from '../ui/Icon'
import type { ColumnsType } from 'antd/es/table'
import type { HelmManifestResource, HelmRelease } from '@shared/types/helm'
import type { ResourceFocus } from '@shared/types/navigation'
import { useHelmReleaseDetail } from '../../queries/useHelm'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { ResizableTable } from '../../utils/ResizableTable'
import { HelmReleaseHistoryTab } from './HelmReleaseHistoryTab'

export type HelmDetailTab = 'overview' | 'history'

interface HelmReleaseDetailPanelProps {
  clusterId: string
  release: HelmRelease
  initialTab?: HelmDetailTab
  onClose: () => void
  onNavigateToResource: (focus: ResourceFocus) => void
}

export function HelmReleaseDetailPanel({
  clusterId,
  release,
  initialTab = 'overview',
  onClose,
  onNavigateToResource
}: HelmReleaseDetailPanelProps): React.JSX.Element {
  const { token } = theme.useToken()
  const [tab, setTab] = useState<HelmDetailTab>(initialTab)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab, release.id])

  const { data, isLoading } = useHelmReleaseDetail(
    clusterId,
    release.namespace,
    release.name,
    tab === 'overview'
  )
  const detail = data && 'detail' in data ? data.detail : null
  const error = data && 'error' in data ? data.error : null

  const resourceColumns: ColumnsType<HelmManifestResource> = [
    { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 140 },
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Namespace', dataIndex: 'namespace', key: 'namespace', width: 140, ellipsis: true },
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
    <div className="ml-helm-detail">
      <div className="ml-helm-detail__header">
        <div className="ml-helm-detail__title">
          <Typography.Text strong>{release.name}</Typography.Text>
          <Typography.Text type="secondary">{release.namespace}</Typography.Text>
        </div>
        <Button type="text" size="small" icon={<Icon icon={X} variant="detail" />} onClick={onClose} />
      </div>

      <Tabs
        className="ml-helm-detail__tabs"
        activeKey={tab}
        onChange={(key) => setTab(key as HelmDetailTab)}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <div className="ml-helm-detail__tab-body">
                {isLoading ? (
                  <LoadingState />
                ) : error ? (
                  <Empty description={error} />
                ) : !detail ? (
                  <Empty description="Release detail unavailable" />
                ) : (
                  <Splitter layout="vertical" style={{ height: '100%' }}>
                    <Splitter.Panel defaultSize="45%" min="25%">
                      <div className="ml-helm-detail__overview-top">
                        <Descriptions bordered size="small" column={2} style={{ marginBottom: 12 }}>
                          <Descriptions.Item label="Chart">
                            {detail.chartName}-{detail.chartVersion}
                          </Descriptions.Item>
                          <Descriptions.Item label="Revision">{detail.revision}</Descriptions.Item>
                          <Descriptions.Item label="Status">
                            <Tag>{detail.status}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="App version">
                            {detail.appVersion || '-'}
                          </Descriptions.Item>
                        </Descriptions>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                          Values (revision {detail.revision})
                        </Typography.Text>
                        <pre
                          className="ml-helm-detail__values"
                          style={{
                            borderRadius: token.borderRadius,
                            background: token.colorFillAlter
                          }}
                        >
                          {detail.valuesYaml}
                        </pre>
                      </div>
                    </Splitter.Panel>
                    <Splitter.Panel defaultSize="55%" min="25%">
                      <div className="ml-helm-detail__overview-bottom">
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                          Resources ({detail.resources.length})
                        </Typography.Text>
                        <div className="ml-helm-detail__resources">
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
            )
          },
          {
            key: 'history',
            label: 'History',
            children: (
              <div className="ml-helm-detail__tab-body">
                <HelmReleaseHistoryTab
                  clusterId={clusterId}
                  namespace={release.namespace}
                  name={release.name}
                  active={tab === 'history'}
                />
              </div>
            )
          }
        ]}
      />
    </div>
  )
}
