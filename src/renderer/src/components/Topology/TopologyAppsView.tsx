import { Card, Col, Row, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { TopologyApplication, TopologyGraphResponse } from '@shared/types/topology'
import { topologyNodeAge } from './topologyInsights'

interface TopologyAppsViewProps {
  graph: TopologyGraphResponse
  onSelectApp: (app: TopologyApplication) => void
}

export function TopologyAppsView({ graph, onSelectApp }: TopologyAppsViewProps): React.JSX.Element {
  const { t } = useTranslation()
  if (graph.applications.length === 0) {
    return (
      <div className="ml-topo-empty">
        <Typography.Text type="secondary">{t('topology.apps.empty')}</Typography.Text>
      </div>
    )
  }

  return (
    <Row gutter={[12, 12]} className="ml-topo-apps">
      {graph.applications.map((app) => {
        const sample = graph.nodes.find((n) => n.id === app.resourceIds[0])
        return (
          <Col key={app.id} xs={24} sm={12} lg={8} xl={6}>
            <Card
              size="small"
              hoverable
              className={`ml-topo-app-card ml-topo-app-card--${app.health}`}
              onClick={() => onSelectApp(app)}
            >
              <div className="ml-topo-app-card__head">
                <Typography.Text strong ellipsis>
                  {app.name}
                </Typography.Text>
                <Tag>{t(`topology.health.${app.health}`)}</Tag>
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {app.namespace}
              </Typography.Text>
              <div className="ml-topo-app-card__stats">
                <div>
                  <span className="ml-topo-app-card__label">{t('topology.apps.replicas')}</span>
                  <strong>{app.replicaSummary}</strong>
                </div>
                <div>
                  <span className="ml-topo-app-card__label">{t('topology.apps.uptime')}</span>
                  <strong>{sample ? topologyNodeAge(sample) : '—'}</strong>
                </div>
                <div>
                  <span className="ml-topo-app-card__label">{t('topology.apps.errors')}</span>
                  <strong className={app.errorCount > 0 ? 'ml-topo-error-count' : undefined}>
                    {app.errorCount}
                  </strong>
                </div>
              </div>
            </Card>
          </Col>
        )
      })}
    </Row>
  )
}
