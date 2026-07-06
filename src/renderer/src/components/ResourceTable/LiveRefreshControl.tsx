import { Button, Space } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

interface LiveRefreshControlProps {
  isFetching: boolean
  onManualRefresh: () => void
}

export function LiveRefreshControl({ isFetching, onManualRefresh }: LiveRefreshControlProps): React.JSX.Element {
  return (
    <Space size="small">
      <Button icon={<ReloadOutlined />} onClick={onManualRefresh} loading={isFetching}>
        Refresh
      </Button>
    </Space>
  )
}
