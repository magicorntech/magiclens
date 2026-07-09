import { ClusterView } from '../../pages/ClusterView'
import { useClusterStore } from '../../stores/clusterStore'
import { ClusterPaneTabStrip } from './ClusterPaneTabStrip'

interface SplitClusterPaneProps {
  clusterId: string
  pane: 'left' | 'right'
  focused: boolean
}

export function SplitClusterPane({ clusterId, pane, focused }: SplitClusterPaneProps): React.JSX.Element {
  const setFocusedSplitPane = useClusterStore((s) => s.setFocusedSplitPane)

  return (
    <div className={`ml-split-cluster-column${focused ? ' ml-split-cluster-column--focused' : ''}`}>
      <ClusterPaneTabStrip clusterId={clusterId} pane={pane} showSplitControl={pane === 'left'} />
      <div
        className={`ml-split-cluster-pane${focused ? ' ml-split-cluster-pane--focused' : ''}`}
        onMouseDown={() => setFocusedSplitPane(pane)}
      >
        <ClusterView clusterId={clusterId} splitPane={pane} />
      </div>
    </div>
  )
}
