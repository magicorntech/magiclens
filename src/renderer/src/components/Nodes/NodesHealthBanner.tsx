import { Box, Server } from 'lucide-react'
import type { ClusterMetricsSummary } from '@shared/types/metrics'
import { Icon } from '../ui/Icon'
import { clusterHealthStatus } from './nodesOverviewUtils'
import { MotionDiv, fadeIn } from '../ui/Motion'

interface NodesHealthBannerProps {
  data: ClusterMetricsSummary
}

export function NodesHealthBanner({ data }: NodesHealthBannerProps): React.JSX.Element {
  const health = clusterHealthStatus(data)
  const totalPods = data.runningPods + data.pendingPods + data.failedPods

  return (
    <MotionDiv className="ml-nodes-health-banner" {...fadeIn}>
      <div className={`ml-nodes-health-status ml-nodes-health-status--${health.tone}`}>
        <span className="ml-nodes-health-dot" aria-hidden />
        <span className="ml-nodes-health-label">{health.label}</span>
      </div>

      <div className="ml-nodes-health-stats">
        <div className="ml-nodes-health-stat">
          <div className="ml-nodes-health-stat-row">
            <Icon icon={Server} variant="detail" />
            <span className="ml-nodes-health-value">{data.totalNodes}</span>
            <span className="ml-nodes-health-stat-label">Nodes</span>
          </div>
          <span className="ml-nodes-health-sub">
            {data.readyNodes} ready · {data.notReadyNodes} not ready
          </span>
        </div>
        <div className="ml-nodes-health-divider" aria-hidden />
        <div className="ml-nodes-health-stat">
          <div className="ml-nodes-health-stat-row">
            <Icon icon={Box} variant="detail" />
            <span className="ml-nodes-health-value">{totalPods}</span>
            <span className="ml-nodes-health-stat-label">Pods</span>
          </div>
          <span className="ml-nodes-health-sub">
            {data.runningPods} running · {data.pendingPods} pending · {data.failedPods} failed
          </span>
        </div>
        <div className="ml-nodes-health-divider" aria-hidden />
        <span className="ml-nodes-health-message">{health.message}</span>
      </div>
    </MotionDiv>
  )
}
