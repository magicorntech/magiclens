import { Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { MoreOutlined } from '@ant-design/icons'

interface HelmRowActionsProps {
  items: MenuProps['items']
}

export function HelmRowActions({ items }: HelmRowActionsProps): React.JSX.Element {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
        <Button size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </div>
  )
}
