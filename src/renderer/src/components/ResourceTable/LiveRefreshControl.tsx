import { useEffect, useState } from 'react'
import { Button, Space, Tooltip, Typography } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { useLiveRefreshStore } from '../../stores/liveRefreshStore'

interface LiveRefreshControlProps {
  dataUpdatedAt: number
  isFetching: boolean
  onManualRefresh: () => void
}

function formatRelativeSeconds(updatedAt: number, now: number): string {
  if (!updatedAt) return 'never'
  const seconds = Math.max(0, Math.round((now - updatedAt) / 1000))
  if (seconds < 1) return 'just now'
  return `${seconds}s ago`
}

export function LiveRefreshControl({ dataUpdatedAt, isFetching, onManualRefresh }: LiveRefreshControlProps): React.JSX.Element {
  const paused = useLiveRefreshStore((s) => s.paused)
  const togglePaused = useLiveRefreshStore((s) => s.togglePaused)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [])

  return (
    <Space size="small">
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'inline-block', width: 92 }}>
        Updated {formatRelativeSeconds(dataUpdatedAt, now)}
      </Typography.Text>
      <Tooltip title={paused ? 'Resume live refresh' : 'Pause live refresh (interval configurable in Settings)'}>
        <Button
          size="small"
          icon={paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          onClick={togglePaused}
        />
      </Tooltip>
      <Button icon={<ReloadOutlined />} onClick={onManualRefresh} loading={isFetching}>
        Refresh
      </Button>
    </Space>
  )
}
