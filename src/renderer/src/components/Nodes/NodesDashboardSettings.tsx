import { useRef } from 'react'
import { Switch, Typography } from 'antd'
import { GripVertical } from 'lucide-react'
import {
  NODES_DASHBOARD_SECTION_LABELS,
  type NodesDashboardSectionId
} from '@shared/types/nodesDashboard'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { Icon } from '../ui/Icon'

export function NodesDashboardSettings(): React.JSX.Element {
  const prefs = useDisplaySettingsStore((s) => s.nodesDashboard)
  const toggleSection = useDisplaySettingsStore((s) => s.toggleNodesDashboardSection)
  const reorderSections = useDisplaySettingsStore((s) => s.reorderNodesDashboardSections)
  const dragIdRef = useRef<NodesDashboardSectionId | null>(null)

  return (
    <div className="ml-nodes-dashboard-settings">
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
        Choose which sections appear on the Nodes page and drag to reorder them.
      </Typography.Text>
      <ul className="ml-nodes-dashboard-settings-list">
        {prefs.order.map((id) => (
          <li
            key={id}
            className="ml-nodes-dashboard-settings-item"
            draggable
            onDragStart={() => {
              dragIdRef.current = id
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const from = dragIdRef.current
              dragIdRef.current = null
              if (from) void reorderSections(from, id)
            }}
          >
            <Icon icon={GripVertical} variant="micro" className="ml-nodes-dashboard-settings-grip" />
            <span className="ml-nodes-dashboard-settings-label">{NODES_DASHBOARD_SECTION_LABELS[id]}</span>
            <Switch
              size="small"
              checked={prefs.visible[id]}
              onChange={() => void toggleSection(id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
