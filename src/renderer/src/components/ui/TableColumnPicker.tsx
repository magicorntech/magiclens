import { useRef } from 'react'
import { Dropdown, type MenuProps } from 'antd'
import { Columns3, GripVertical } from 'lucide-react'
import { Icon } from './Icon'

interface TableColumnPickerProps {
  columns: { key: string; title: string; visible: boolean }[]
  onToggle: (key: string) => void
  onReorder: (fromKey: string, toKey: string) => void
  onReset: () => void
}

export function TableColumnPicker({ columns, onToggle, onReorder, onReset }: TableColumnPickerProps): React.JSX.Element {
  const dragKeyRef = useRef<string | null>(null)

  const items: MenuProps['items'] = [
    ...columns.map((col) => ({
      key: col.key,
      label: (
        <div
          className="ml-column-picker-item"
          draggable
          onDragStart={() => {
            dragKeyRef.current = col.key
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const from = dragKeyRef.current
            dragKeyRef.current = null
            if (from) onReorder(from, col.key)
          }}
        >
          <Icon icon={GripVertical} variant="micro" className="ml-column-picker-grip" />
          <label onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={col.visible} onChange={() => onToggle(col.key)} />
            <span>{col.title}</span>
          </label>
        </div>
      )
    })),
    { type: 'divider' as const },
    { key: '__reset__', label: 'Reset columns', onClick: onReset }
  ]

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <button type="button" className="ml-btn ml-btn--ghost" aria-label="Columns">
        <Icon icon={Columns3} variant="detail" />
        Columns
      </button>
    </Dropdown>
  )
}
