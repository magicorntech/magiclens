import { Button, Tabs, Tooltip } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { TerminalView } from '../Terminal/TerminalView'
import { YamlEditorPanelBody } from '../ResourceTable/YamlEditorPanelBody'
import { ResourceDetailTabBody } from '../ResourceTable/ResourceDetailTabBody'
import { useBottomPanel } from './BottomPanelContext'

export function BottomPanel(): React.JSX.Element {
  const { tabs, activeTabId, addTerminalTab, closeTab, setActiveTab, closeAll } = useBottomPanel()

  const items = tabs.map((tab) => ({
    key: tab.id,
    label: tab.title,
    children:
      tab.kind === 'terminal' ? (
        <TerminalView sessionId={tab.id} isActive={activeTabId === tab.id} />
      ) : tab.kind === 'yaml' ? (
        <YamlEditorPanelBody tab={tab} onDone={() => closeTab(tab.id)} />
      ) : (
        <ResourceDetailTabBody tab={tab} isActive={activeTabId === tab.id} onClose={() => closeTab(tab.id)} />
      )
  }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--ml-panel-bg)' }}>
      <Tabs
        type="editable-card"
        size="small"
        hideAdd={false}
        activeKey={activeTabId ?? undefined}
        onChange={setActiveTab}
        onEdit={(targetKey, action) => {
          if (action === 'add') addTerminalTab()
          else if (typeof targetKey === 'string') closeTab(targetKey)
        }}
        items={items}
        style={{ height: '100%' }}
        tabBarStyle={{ margin: 0, padding: '0 8px' }}
        tabBarExtraContent={{
          right: (
            <Tooltip title="Close panel">
              <Button type="text" size="small" icon={<CloseOutlined />} onClick={closeAll} />
            </Tooltip>
          )
        }}
      />
    </div>
  )
}
