import { ClusterView } from '../../pages/ClusterView'
import { useClusterStore } from '../../stores/clusterStore'

interface SplitClusterPaneProps {
  clusterId: string
  pane: 'left' | 'right'
  focused: boolean
}

/** Split pane body only — cluster tabs stay in the top browser strip (avoids duplicate tabs). */
export function SplitClusterPane({ clusterId, pane, focused }: SplitClusterPaneProps): React.JSX.Element {
  const setFocusedSplitPane = useClusterStore((s) => s.setFocusedSplitPane)
  const clusters = useClusterStore((s) => s.clusters)
  const cluster = clusters.find((c) => c.id === clusterId)

  return (
    <div className={`ml-split-cluster-column${focused ? ' ml-split-cluster-column--focused' : ''}`}>
      <div
        className={`ml-split-cluster-pane-label${focused ? ' is-focused' : ''}`}
        onMouseDown={() => setFocusedSplitPane(pane)}
      >
        <span
          className={`ml-split-cluster-pane-label__dot ml-split-cluster-pane-label__dot--${cluster?.status ?? 'idle'}`}
          aria-hidden
        />
        <span className="ml-split-cluster-pane-label__name">
          {cluster?.customName ?? clusterId}
        </span>
        <span className="ml-split-cluster-pane-label__side">{pane === 'left' ? 'Left' : 'Right'}</span>
      </div>
      <div
        className={`ml-split-cluster-pane${focused ? ' ml-split-cluster-pane--focused' : ''}`}
        onMouseDown={() => setFocusedSplitPane(pane)}
      >
        <ClusterView clusterId={clusterId} splitPane={pane} />
      </div>
    </div>
  )
}
