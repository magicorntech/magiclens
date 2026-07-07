import type { ReactNode, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button, Layout, Space, Splitter, Tag, theme, Typography } from 'antd'
import { CodeOutlined } from '@ant-design/icons'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ClusterEntry } from '../../stores/clusterStore'
import { useClusterStore } from '../../stores/clusterStore'
import type { VirtualPageKey } from '../../resourceConfig/kinds.renderer'
import { ResourceMenu } from './ResourceMenu'
import { NamespaceSelector } from './NamespaceSelector'
import { BottomPanel } from './BottomPanel'
import { BottomPanelProvider, useBottomPanel } from './BottomPanelContext'

const TERMINAL_LABEL_MIN_WIDTH = 480

function useCompactToolbar(ref: RefObject<HTMLElement | null>): boolean {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < TERMINAL_LABEL_MIN_WIDTH)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return compact
}
const { Header, Sider, Content } = Layout

interface AppShellProps {
  cluster: ClusterEntry
  onNamespaceChange: (namespace: string) => void
  onSelectKind: (kind: ResourceKind) => void
  selectedVirtualPage: VirtualPageKey | null
  onSelectVirtualPage: (key: VirtualPageKey) => void
  children: ReactNode
}

export function AppShell(props: AppShellProps): React.JSX.Element {
  return (
    <BottomPanelProvider>
      <AppShellInner {...props} />
    </BottomPanelProvider>
  )
}

function AppShellInner({
  cluster,
  onNamespaceChange,
  onSelectKind,
  selectedVirtualPage,
  onSelectVirtualPage,
  children
}: AppShellProps): React.JSX.Element {
  const { token } = theme.useToken()
  const resourceMenuCollapsed = useClusterStore((s) => s.resourceMenuCollapsed)
  const setResourceMenuCollapsed = useClusterStore((s) => s.setResourceMenuCollapsed)
  const splitView = useClusterStore((s) => s.splitView)
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const compactToolbar = useCompactToolbar(headerInnerRef)
  const { tabs, addTerminalTab, setActiveTab } = useBottomPanel()

  const hasTerminalTab = tabs.some((t) => t.kind === 'terminal')

  function handleTerminalClick(): void {
    const existing = tabs.find((t) => t.kind === 'terminal')
    if (existing) setActiveTab(existing.id)
    else addTerminalTab()
  }

  return (
    <Layout style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Header
        style={{
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: 'var(--ml-shadow-sm)',
          padding: splitView ? '0 10px' : '0 16px',
          height: splitView ? 36 : 56,
          lineHeight: splitView ? '36px' : '56px',
          flexShrink: 0,
          zIndex: 1
        }}
      >
        <div
          ref={headerInnerRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: splitView ? 'flex-end' : 'space-between',
            width: '100%',
            height: '100%'
          }}
        >
        {!splitView && (
          <Space>
            <Typography.Text strong>{cluster.customName}</Typography.Text>
            {cluster.serverVersion && <Tag color="blue">{cluster.serverVersion}</Tag>}
          </Space>
        )}
        <Space size={splitView ? 'small' : 'middle'}>
          <Button
            type={hasTerminalTab ? 'primary' : 'default'}
            size={splitView ? 'small' : 'middle'}
            icon={<CodeOutlined />}
            onClick={handleTerminalClick}
          >
            {!compactToolbar && 'Terminal'}
          </Button>
          <NamespaceSelector clusterId={cluster.id} value={cluster.selectedNamespace} onChange={onNamespaceChange} />
        </Space>
        </div>
      </Header>
      <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sider
          width={220}
          theme="dark"
          collapsible
          collapsed={resourceMenuCollapsed}
          onCollapse={setResourceMenuCollapsed}
          collapsedWidth={56}
          style={{ overflow: 'auto' }}
        >
          <ResourceMenu
            clusterId={cluster.id}
            selectedKind={cluster.selectedResourceKind}
            selectedVirtualPage={selectedVirtualPage}
            onSelect={onSelectKind}
            onSelectVirtualPage={onSelectVirtualPage}
          />
        </Sider>
        <Content
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: 16,
            background: token.colorBgLayout
          }}
        >
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {tabs.length > 0 ? (
              <Splitter layout="vertical" style={{ height: '100%' }}>
                <Splitter.Panel defaultSize="65%" min="25%">
                  <div style={{ height: '100%', overflow: 'hidden' }}>{children}</div>
                </Splitter.Panel>
                <Splitter.Panel defaultSize="35%" min="15%" max="75%">
                  <BottomPanel />
                </Splitter.Panel>
              </Splitter>
            ) : (
              children
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
