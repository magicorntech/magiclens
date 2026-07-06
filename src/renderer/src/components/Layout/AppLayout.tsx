import { Layout } from 'antd'
import { useClusterStore } from '../../stores/clusterStore'
import { ClusterListPage } from '../../pages/ClusterListPage'
import { ClusterTabBar } from '../ClusterTabs/ClusterTabBar'
import { LeftSidebar } from './LeftSidebar'

export function AppLayout(): React.JSX.Element {
  const activeView = useClusterStore((s) => s.activeView)

  return (
    <Layout style={{ height: '100vh', flexDirection: 'row' }}>
      <LeftSidebar />
      {/* position:relative + an absolutely-filled child gives a hard-guaranteed viewport size
          that never grows with content, regardless of how percentage-height/flex propagates
          through the nested antd Layout/Tabs tree beneath it. Scrolling then happens strictly
          inside that fixed box (ClusterListPage / AppShell's own Content), so the sidebar,
          cluster tab bar, and per-cluster header never move when a resource table scrolls. */}
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeView === 'clusters' ? <ClusterListPage /> : <ClusterTabBar />}
        </div>
      </div>
    </Layout>
  )
}
