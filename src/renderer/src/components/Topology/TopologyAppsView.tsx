import { useMemo, useState } from 'react'
import { Card, Col, Input, Row, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { TopologyApplication, TopologyGraphResponse } from '@shared/types/topology'
import { topologyNodeAge } from './topologyInsights'

interface TopologyAppsViewProps {
  graph: TopologyGraphResponse
  onSelectApp: (app: TopologyApplication) => void
}

export function TopologyAppsView({ graph, onSelectApp }: TopologyAppsViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const apps = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = graph.applications
    if (!q) return list
    return list.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.namespace.toLowerCase().includes(q) ||
        app.replicaSummary.toLowerCase().includes(q)
    )
  }, [graph.applications, query])

  if (graph.applications.length === 0) {
    return (
      <div className="ml-topo-empty">
        <Typography.Text type="secondary">{t('topology.apps.empty')}</Typography.Text>
      </div>
    )
  }

  return (
    <div className="ml-topo-apps-wrap">
      <div className="ml-topo-apps-toolbar">
        <Input.Search
          allowClear
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('topology.apps.search')}
          style={{ maxWidth: 280 }}
        />
        {query.trim() ? (
          <Typography.Text type="secondary" className="ml-topo-apps-count">
            {apps.length}/{graph.applications.length}
          </Typography.Text>
        ) : null}
      </div>

      {apps.length === 0 ? (
        <div className="ml-topo-empty">
          <Typography.Text type="secondary">{t('topology.apps.noMatch')}</Typography.Text>
        </div>
      ) : (
        <Row gutter={[12, 12]} className="ml-topo-apps">
          {apps.map((app) => {
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
      )}
    </div>
  )
}
