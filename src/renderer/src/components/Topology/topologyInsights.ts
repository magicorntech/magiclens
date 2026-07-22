import i18n from '../../i18n'
import type { TopologyGraphResponse, TopologyInsight, TopologyNode } from '@shared/types/topology'

export function buildTopologyInsights(graph: TopologyGraphResponse): TopologyInsight[] {
  const insights: TopologyInsight[] = []
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const t = i18n.t.bind(i18n)

  for (const node of graph.nodes) {
    if (node.kind === 'Pod' && /crashloop/i.test(node.healthDetail ?? '')) {
      insights.push({
        id: `crashloop-${node.id}`,
        severity: 'error',
        title: t('topology.insightItems.crashloopTitle', { name: node.name }),
        detail: node.healthDetail ?? t('topology.insightItems.crashloopDetail'),
        nodeIds: [node.id]
      })
    }
    if (node.kind === 'Service' && node.healthDetail === 'No matching pods') {
      insights.push({
        id: `svc-empty-${node.id}`,
        severity: 'warning',
        title: t('topology.insightItems.serviceEmptyTitle', { name: node.name }),
        detail: t('topology.insightItems.serviceEmptyDetail'),
        nodeIds: [node.id]
      })
    }
    if (node.kind === 'Ingress' && node.healthDetail === 'No backend services') {
      insights.push({
        id: `ing-orphan-${node.id}`,
        severity: 'warning',
        title: t('topology.insightItems.ingressOrphanTitle', { name: node.name }),
        detail: t('topology.insightItems.ingressOrphanDetail'),
        nodeIds: [node.id]
      })
    }
  }

  for (const edge of graph.edges) {
    if (edge.relation !== 'routes') continue
    const target = byId.get(edge.target)
    if (!target) {
      insights.push({
        id: `broken-route-${edge.id}`,
        severity: 'error',
        title: t('topology.insightItems.brokenRouteTitle'),
        detail: t('topology.insightItems.brokenRouteDetail', { target: edge.target }),
        nodeIds: [edge.source]
      })
    }
  }

  const depWithoutPods = graph.nodes.filter(
    (n) =>
      (n.kind === 'Deployment' || n.kind === 'StatefulSet') &&
      (n.replicasDesired ?? 0) > 0 &&
      (n.replicasReady ?? 0) === 0
  )
  for (const node of depWithoutPods) {
    insights.push({
      id: `zero-ready-${node.id}`,
      severity: 'error',
      title: t('topology.insightItems.zeroReadyTitle', { name: node.name }),
      detail: t('topology.insightItems.zeroReadyDetail', {
        ready: node.replicasReady ?? 0,
        desired: node.replicasDesired ?? 0
      }),
      nodeIds: [node.id]
    })
  }

  return insights
}

export function topologyNodeAge(node: TopologyNode): string {
  if (!node.ageTimestamp) return '—'
  const ms = Date.now() - new Date(node.ageTimestamp).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
