import { useEffect, useState } from 'react'
import { Button, Descriptions, Divider, Modal, Select, Space, Switch, Tag, Typography } from 'antd'
import { SyncOutlined } from '@ant-design/icons'
import { refreshIntervalOptions, useLiveRefreshStore } from '../../stores/liveRefreshStore'
import { useUpdateStore } from '../../stores/updateStore'
import type { AppInfoResponse } from '@shared/types/app'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): React.JSX.Element {
  const interval = useLiveRefreshStore((s) => s.interval)
  const setInterval_ = useLiveRefreshStore((s) => s.setInterval)
  const [appInfo, setAppInfo] = useState<AppInfoResponse | null>(null)

  const updateSettings = useUpdateStore((s) => s.settings)
  const updateState = useUpdateStore((s) => s.state)
  const saveUpdateSettings = useUpdateStore((s) => s.saveSettings)
  const check = useUpdateStore((s) => s.check)
  const openUpdateCenter = useUpdateStore((s) => s.openCenter)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void window.api.app.getInfo().then((info) => {
      if (!cancelled) setAppInfo(info)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <Modal title="Settings" open={open} onCancel={onClose} footer={null}>
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Typography.Text strong>Resource refresh interval</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <Select
              value={interval}
              onChange={setInterval_}
              options={refreshIntervalOptions}
              style={{ width: 160 }}
            />
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            How often resource lists and metrics refresh automatically. Applies to every open cluster tab; pausing
            live refresh is still available per resource view.
          </Typography.Text>
        </div>

        <Divider style={{ margin: '4px 0' }} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography.Text strong>Updates</Typography.Text>
            {updateState?.latestVersion && updateState.phase !== 'not-available' && (
              <Tag color="blue">v{updateState.latestVersion} available</Tag>
            )}
          </div>
          <Space orientation="vertical" style={{ width: '100%', marginTop: 8 }} size={8}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography.Text>Check for updates automatically</Typography.Text>
              <Switch
                checked={updateSettings?.checkAutomatically ?? true}
                onChange={(checked) => void saveUpdateSettings({ checkAutomatically: checked })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography.Text>Check on startup</Typography.Text>
              <Switch
                checked={updateSettings?.checkOnStartup ?? true}
                onChange={(checked) => void saveUpdateSettings({ checkOnStartup: checked })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography.Text>Include pre-release versions</Typography.Text>
              <Switch
                checked={updateSettings?.includePrerelease ?? false}
                onChange={(checked) => void saveUpdateSettings({ includePrerelease: checked })}
              />
            </div>
            {updateState?.manualDownloadOnly ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Automatic download/install isn't available on macOS without a paid Apple Developer ID
                certificate. When an update is found, MagicLens links out to the GitHub release for a manual
                DMG download instead.
              </Typography.Text>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>Auto-download updates</Typography.Text>
                  <Switch
                    checked={updateSettings?.autoDownload ?? false}
                    onChange={(checked) => void saveUpdateSettings({ autoDownload: checked })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography.Text>Ask before install</Typography.Text>
                  <Switch
                    checked={updateSettings?.askBeforeInstall ?? true}
                    onChange={(checked) => void saveUpdateSettings({ askBeforeInstall: checked })}
                  />
                </div>
              </>
            )}
            <Space style={{ marginTop: 4 }}>
              <Button
                size="small"
                icon={<SyncOutlined />}
                loading={updateState?.phase === 'checking'}
                onClick={() => void check()}
              >
                Check for updates now
              </Button>
              <Button size="small" onClick={() => openUpdateCenter()}>
                Open Update Center
              </Button>
            </Space>
          </Space>
        </div>

        <Divider style={{ margin: '4px 0' }} />

        <div>
          <Typography.Text strong>About</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Version">{appInfo?.version ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Build">{appInfo?.buildNumber ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Electron">{appInfo?.electronVersion ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Chromium">{appInfo?.chromeVersion ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Node.js">{appInfo?.nodeVersion ?? '-'}</Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      </Space>
    </Modal>
  )
}
