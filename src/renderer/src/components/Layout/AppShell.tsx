import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Layout, Space, Splitter, Tag, theme, Typography } from 'antd'
import { CodeOutlined } from '@ant-design/icons'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ClusterEntry } from '../../stores/clusterStore'
import type { VirtualPageKey } from '../../resourceConfig/kinds.renderer'
import { ResourceMenu } from './ResourceMenu'
import { NamespaceSelector } from './NamespaceSelector'
import { BottomPanel } from './BottomPanel'
import { BottomPanelProvider, useBottomPanel } from './BottomPanelContext'

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
  const [collapsed, setCollapsed] = useState(false)
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 56,
          lineHeight: '56px',
          flexShrink: 0,
          zIndex: 1
        }}
      >
        <Space>
          <Typography.Text strong>{cluster.customName}</Typography.Text>
          {cluster.serverVersion && <Tag color="blue">{cluster.serverVersion}</Tag>}
        </Space>
        <Space>
          <Button type={hasTerminalTab ? 'primary' : 'default'} icon={<CodeOutlined />} onClick={handleTerminalClick}>
            Terminal
          </Button>
          <NamespaceSelector clusterId={cluster.id} value={cluster.selectedNamespace} onChange={onNamespaceChange} />
        </Space>
      </Header>
      <Layout style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sider
          width={220}
          theme="dark"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          collapsedWidth={56}
          style={{ overflow: 'auto' }}
        >
          <ResourceMenu
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
