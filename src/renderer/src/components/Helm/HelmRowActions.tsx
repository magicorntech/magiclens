import { Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { MoreHorizontal } from 'lucide-react'
import { Icon } from '../ui/Icon'

interface HelmRowActionsProps {
  items: MenuProps['items']
}

export function HelmRowActions({ items }: HelmRowActionsProps): React.JSX.Element {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
        <Button size="small" icon={<Icon icon={MoreHorizontal} variant="detail" />} />
      </Dropdown>
    </div>
  )
}
