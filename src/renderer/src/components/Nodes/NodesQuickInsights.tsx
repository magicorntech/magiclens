import type { NodeInsight, TopConsumerEntry } from './nodesOverviewUtils'
import { MotionDiv, fadeIn } from '../ui/Motion'

interface NodesQuickInsightsProps {
  insights: NodeInsight[]
  onNavigateToNode?: (nodeName: string) => void
}

export function NodesQuickInsights({ insights, onNavigateToNode }: NodesQuickInsightsProps): React.JSX.Element {
  if (insights.length === 0) return <></>

  return (
    <MotionDiv className="ml-nodes-quick-insights" {...fadeIn}>
      <h4 className="ml-nodes-section-title">Quick Insights</h4>
      <div className="ml-nodes-quick-insights-grid">
        {insights.map((insight) => {
          const clickable = !!insight.targetNode && insight.value !== 'None' && onNavigateToNode
          const Tag = clickable ? 'button' : 'div'
          return (
            <Tag
              key={insight.label}
              type={clickable ? 'button' : undefined}
              className={`ml-nodes-insight ml-nodes-insight--${insight.tone ?? 'default'}${clickable ? ' ml-nodes-insight--clickable' : ''}`}
              title={insight.detail}
              onClick={
                clickable
                  ? () => onNavigateToNode(insight.targetNode!)
                  : undefined
              }
            >
              <span className="ml-nodes-insight-label">{insight.label}</span>
              <span className="ml-nodes-insight-value">{insight.value}</span>
              {insight.detail && <span className="ml-nodes-insight-detail">{insight.detail}</span>}
            </Tag>
          )
        })}
      </div>
    </MotionDiv>
  )
}

interface NodesTopConsumersProps {
  cpu: TopConsumerEntry[]
  memory: TopConsumerEntry[]
  pods: TopConsumerEntry[]
  restarts: TopConsumerEntry[]
  onNavigateToNode?: (nodeName: string) => void
}

export function NodesTopConsumers({
  cpu,
  memory,
  pods,
  restarts,
  onNavigateToNode
}: NodesTopConsumersProps): React.JSX.Element {
  return (
    <MotionDiv className="ml-nodes-top-consumers" {...fadeIn}>
      <h4 className="ml-nodes-section-title">Top Consumers</h4>
      <div className="ml-nodes-top-consumers-grid">
        <ConsumerWidget title="Top CPU" entries={cpu} emptyLabel="No CPU metrics" onNavigate={onNavigateToNode} />
        <ConsumerWidget title="Top Memory" entries={memory} emptyLabel="No memory metrics" onNavigate={onNavigateToNode} />
        <ConsumerWidget title="Most Pods" entries={pods} emptyLabel="No scheduled pods" onNavigate={onNavigateToNode} />
        <ConsumerWidget title="Restarts" entries={restarts} emptyLabel="No restarts" onNavigate={onNavigateToNode} />
      </div>
    </MotionDiv>
  )
}

function ConsumerWidget({
  title,
  entries,
  emptyLabel,
  onNavigate
}: {
  title: string
  entries: TopConsumerEntry[]
  emptyLabel: string
  onNavigate?: (nodeName: string) => void
}): React.JSX.Element {
  return (
    <div className="ml-nodes-consumer-widget">
      <span className="ml-nodes-consumer-title">{title}</span>
      {entries.length === 0 ? (
        <span className="ml-nodes-consumer-empty">{emptyLabel}</span>
      ) : (
        <ul className="ml-nodes-consumer-list">
          {entries.map((entry, i) => (
            <li key={entry.name} className="ml-nodes-consumer-item">
              <span className="ml-nodes-consumer-rank">{i + 1}</span>
              {onNavigate && entry.targetNode ? (
                <button
                  type="button"
                  className="ml-nodes-consumer-link"
                  onClick={() => onNavigate(entry.targetNode!)}
                  title={`Open node ${entry.name}`}
                >
                  {entry.name}
                </button>
              ) : (
                <span className="ml-nodes-consumer-name">{entry.name}</span>
              )}
              <span className="ml-nodes-consumer-value">{entry.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
