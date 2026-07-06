import { useEffect, useRef } from 'react'
import { Button, Progress, Space, Typography, message } from 'antd'
import { CloseOutlined, DownloadOutlined, ExportOutlined, ReloadOutlined, RocketOutlined } from '@ant-design/icons'
import { useUpdateStore } from '../../stores/updateStore'

export function UpdateNotificationBanner(): React.JSX.Element | null {
  const state = useUpdateStore((s) => s.state)
  const download = useUpdateStore((s) => s.download)
  const install = useUpdateStore((s) => s.install)
  const skip = useUpdateStore((s) => s.skip)
  const remindLater = useUpdateStore((s) => s.remindLater)
  const openCenter = useUpdateStore((s) => s.openCenter)
  const openReleasePage = useUpdateStore((s) => s.openReleasePage)
  const lastErrorRef = useRef<string | null>(null)

  useEffect(() => {
    if (state?.phase === 'error' && state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error
      void message.error(`Update error: ${state.error}`)
    }
  }, [state?.phase, state?.error])

  if (!state) return null

  const isSkipped = state.latestVersion !== null && state.latestVersion === state.skippedVersion
  const showAvailable = state.phase === 'available' && !state.notificationDismissed && !isSkipped
  const showDownloading = state.phase === 'downloading'
  const showDownloaded = state.phase === 'downloaded'

  if (!showAvailable && !showDownloading && !showDownloaded) return null

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: 340,
        background: 'var(--ant-color-bg-elevated)',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        padding: 16,
        zIndex: 1200,
        border: '1px solid rgba(127,127,127,0.2)'
      }}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size={10}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <Space size={8}>
            <RocketOutlined style={{ color: 'var(--ml-primary)', fontSize: 18 }} />
            <Typography.Text strong>
              {showDownloaded ? 'Update ready to install' : showDownloading ? 'Downloading update…' : 'Update available'}
            </Typography.Text>
          </Space>
          {showAvailable && (
            <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => void remindLater()} />
          )}
        </div>

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {showDownloaded
            ? `MagicLens v${state.latestVersion} has been downloaded. Restart to finish installing.`
            : showDownloading
              ? `Downloading v${state.latestVersion}…`
              : state.manualDownloadOnly
                ? `MagicLens v${state.latestVersion} is available (current: v${state.currentVersion}). Automatic install isn't supported on macOS - download the DMG from GitHub.`
                : `MagicLens v${state.latestVersion} is available (current: v${state.currentVersion}).`}
        </Typography.Text>

        {showDownloading && (
          <Progress percent={Math.round(state.progress?.percent ?? 0)} size="small" status="active" />
        )}

        {showAvailable && (
          <Space size={8} wrap>
            {state.manualDownloadOnly ? (
              <Button type="primary" size="small" icon={<ExportOutlined />} onClick={() => void openReleasePage()}>
                Open GitHub release
              </Button>
            ) : (
              <Button type="primary" size="small" icon={<DownloadOutlined />} onClick={() => void download()}>
                Download
              </Button>
            )}
            <Button size="small" onClick={() => openCenter()}>
              Details
            </Button>
            <Button size="small" onClick={() => void skip()}>
              Skip this version
            </Button>
            <Button size="small" onClick={() => void remindLater()}>
              Remind me later
            </Button>
          </Space>
        )}

        {showDownloaded && (
          <Space size={8}>
            <Button type="primary" size="small" icon={<ReloadOutlined />} onClick={() => void install()}>
              Restart & Install
            </Button>
            <Button size="small" onClick={() => openCenter()}>
              Details
            </Button>
          </Space>
        )}
      </Space>
    </div>
  )
}
