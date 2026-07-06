import { Typography } from 'antd'
import { ClusterView } from '../../pages/ClusterView'
import { useClusterStore } from '../../stores/clusterStore'

interface SplitClusterPaneProps {
  clusterId: string
  pane: 'left' | 'right'
  focused: boolean
}

export function SplitClusterPane({ clusterId, pane, focused }: SplitClusterPaneProps): React.JSX.Element {
  const setFocusedSplitPane = useClusterStore((s) => s.setFocusedSplitPane)
  const cluster = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId))

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        boxShadow: focused ? 'inset 0 0 0 2px var(--ml-primary)' : 'inset 0 0 0 1px var(--ml-border-secondary)'
      }}
      onMouseDown={() => setFocusedSplitPane(pane)}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '2px 10px',
          minHeight: 20,
          display: 'flex',
          alignItems: 'center',
          background: focused ? 'var(--ml-selection-bg)' : 'var(--ml-bg-spotlight)',
          borderBottom: '1px solid var(--ml-border-secondary)',
          userSelect: 'none'
        }}
      >
        <Typography.Text
          ellipsis
          style={{
            fontSize: 11,
            lineHeight: '16px',
            fontWeight: focused ? 600 : 500,
            color: focused ? 'var(--ml-primary)' : 'var(--ml-text-secondary)',
            margin: 0
          }}
        >
          {cluster?.customName ?? 'Cluster'}
        </Typography.Text>
      </div>
      <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        <ClusterView clusterId={clusterId} />
      </div>
    </div>
  )
}
