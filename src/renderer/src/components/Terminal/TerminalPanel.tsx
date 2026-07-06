import { useRef, useState } from 'react'
import { Button, Tabs, Tooltip } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { TerminalView } from './TerminalView'

interface TerminalTab {
  id: string
  title: string
}

interface TerminalPanelProps {
  onClose: () => void
}

function newSessionId(): string {
  return `term-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function TerminalPanel({ onClose }: TerminalPanelProps): React.JSX.Element {
  const counterRef = useRef(1)
  const [tabs, setTabs] = useState<TerminalTab[]>(() => [{ id: newSessionId(), title: 'Terminal 1' }])
  const [activeKey, setActiveKey] = useState<string>(tabs[0].id)

  function addTab(): void {
    counterRef.current += 1
    const id = newSessionId()
    setTabs((prev) => [...prev, { id, title: `Terminal ${counterRef.current}` }])
    setActiveKey(id)
  }

  function removeTab(targetKey: string): void {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === targetKey)
      const next = prev.filter((t) => t.id !== targetKey)
      if (activeKey === targetKey && next.length > 0) {
        setActiveKey(next[Math.max(0, idx - 1)].id)
      }
      if (next.length === 0) onClose()
      return next
    })
  }

  function handleEdit(targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove'): void {
    if (action === 'add') addTab()
    else if (typeof targetKey === 'string') removeTab(targetKey)
  }

  const items = tabs.map((tab) => ({
    key: tab.id,
    label: tab.title,
    children: <TerminalView sessionId={tab.id} isActive={activeKey === tab.id} />
  }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, background: '#0d1117' }}>
      <Tabs
        type="editable-card"
        size="small"
        hideAdd={false}
        activeKey={activeKey}
        onChange={setActiveKey}
        onEdit={handleEdit}
        items={items}
        style={{ height: '100%' }}
        tabBarStyle={{ margin: 0, padding: '0 8px' }}
        tabBarExtraContent={{
          right: (
            <Tooltip title="Close terminal panel">
              <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
            </Tooltip>
          )
        }}
      />
    </div>
  )
}
