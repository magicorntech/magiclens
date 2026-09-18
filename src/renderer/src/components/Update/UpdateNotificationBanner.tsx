import { useEffect, useRef } from 'react'
import { Button, Progress, Space, Typography, message } from 'antd'
import { Download, RefreshCw, Rocket, X } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { useUpdateStore } from '../../stores/updateStore'
import { useSettingsUiStore } from '../../stores/settingsUiStore'

export function UpdateNotificationBanner(): React.JSX.Element | null {
  const state = useUpdateStore((s) => s.state)
  const download = useUpdateStore((s) => s.download)
  const install = useUpdateStore((s) => s.install)
  const skip = useUpdateStore((s) => s.skip)
  const remindLater = useUpdateStore((s) => s.remindLater)
  const openReleasePage = useUpdateStore((s) => s.openReleasePage)
  const openUpdateSettings = useSettingsUiStore((s) => s.openSettings)
  const lastErrorRef = useRef<string | null>(null)

  useEffect(() => {
    if (state?.phase === 'error' && state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error
      void message.error(state.error)
    }
  }, [state?.phase, state?.error])

  if (!state) return null

  const isSkipped = state.latestVersion !== null && state.latestVersion === state.skippedVersion
  const showAvailable = state.phase === 'available' && !state.notificationDismissed && !isSkipped
  const showDownloading = state.phase === 'downloading'
  const showDownloaded = state.phase === 'downloaded'
  const showError = state.phase === 'error' && !!state.error && !state.notificationDismissed

  if (!showAvailable && !showDownloading && !showDownloaded && !showError) return null

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: 340,
        // `--ant-*` variables only exist when antd's cssVar theme mode is on, which this app
        // does not enable — the banner rendered with no background at all and the text sat
        // directly on the page. The app's own tokens are always defined.
        background: 'var(--ml-bg-elevated)',
        color: 'var(--ml-text)',
        borderRadius: 0,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        padding: 16,
        zIndex: 1200,
        border: '1px solid var(--ml-border-secondary)'
      }}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size={10}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <Space size={8}>
            <Icon icon={Rocket} variant="toolbar" style={{ color: 'var(--ml-primary)' }} />
            <Typography.Text strong>
              {showError
                ? 'Update could not be installed'
                : showDownloaded
                  ? 'Update ready to install'
                  : showDownloading
                    ? 'Downloading update…'
                    : 'Update available'}
            </Typography.Text>
          </Space>
          {showAvailable && (
            <Button type="text" size="small" icon={<Icon icon={X} variant="detail" />} onClick={() => void remindLater()} />
          )}
        </div>

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {showError
            ? state.error
            : showDownloaded
            ? `MagicLens v${state.latestVersion} has been downloaded. Restart to finish installing.`
            : showDownloading
              ? `Downloading v${state.latestVersion}…`
              : `MagicLens v${state.latestVersion} is available (current: v${state.currentVersion}).`}
        </Typography.Text>

        {showDownloading && (
          <Progress percent={Math.round(state.progress?.percent ?? 0)} size="small" status="active" />
        )}

        {showAvailable && (
          <Space size={8} wrap>
            <Button type="primary" size="small" icon={<Icon icon={Download} variant="detail" />} onClick={() => void download()}>
              Download
            </Button>
            <Button size="small" onClick={() => openUpdateSettings('updates')}>
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

        {showError && (
          <Space size={8} wrap>
            <Button type="primary" size="small" icon={<Icon icon={Download} variant="detail" />} onClick={() => void openReleasePage()}>
              Download installer
            </Button>
            <Button size="small" onClick={() => openUpdateSettings('updates')}>
              Details
            </Button>
            <Button size="small" onClick={() => void remindLater()}>
              Dismiss
            </Button>
          </Space>
        )}

        {showDownloaded && (
          <Space size={8}>
            <Button type="primary" size="small" icon={<Icon icon={RefreshCw} variant="detail" />} onClick={() => void install()}>
              Restart & Install
            </Button>
            <Button size="small" onClick={() => openUpdateSettings('updates')}>
              Details
            </Button>
          </Space>
        )}
      </Space>
    </div>
  )
}
