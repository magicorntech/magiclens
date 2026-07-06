import { Alert, Button, Descriptions, Modal, Progress, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, DownloadOutlined, ExportOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import type { UpdatePhase } from '@shared/types/update'
import { useUpdateStore } from '../../stores/updateStore'

const phaseLabel: Record<UpdatePhase, string> = {
  idle: 'Up to date',
  checking: 'Checking for updates…',
  available: 'Update available',
  'not-available': 'You are on the latest version',
  downloading: 'Downloading…',
  downloaded: 'Downloaded — restart required',
  error: 'Update check failed'
}

const phaseColor: Record<UpdatePhase, string> = {
  idle: 'default',
  checking: 'processing',
  available: 'blue',
  'not-available': 'green',
  downloading: 'processing',
  downloaded: 'green',
  error: 'red'
}

export function UpdateCenterModal(): React.JSX.Element {
  const open = useUpdateStore((s) => s.centerOpen)
  const close = useUpdateStore((s) => s.closeCenter)
  const state = useUpdateStore((s) => s.state)
  const check = useUpdateStore((s) => s.check)
  const download = useUpdateStore((s) => s.download)
  const install = useUpdateStore((s) => s.install)
  const skip = useUpdateStore((s) => s.skip)
  const openReleasePage = useUpdateStore((s) => s.openReleasePage)

  const phase = state?.phase ?? 'idle'
  const isSkipped = !!state?.latestVersion && state.latestVersion === state.skippedVersion
  const manualDownloadOnly = state?.manualDownloadOnly ?? false

  return (
    <Modal title="Update Center" open={open} onCancel={close} footer={null} width={520}>
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Current version">v{state?.currentVersion ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Latest version">
            {state?.latestVersion ? `v${state.latestVersion}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Space size={6}>
              <Tag
                icon={phase === 'checking' || phase === 'downloading' ? <SyncOutlined spin /> : undefined}
                color={phaseColor[phase]}
              >
                {phaseLabel[phase]}
              </Tag>
              {isSkipped && <Tag>Skipped by you</Tag>}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        {phase === 'downloading' && <Progress percent={Math.round(state?.progress?.percent ?? 0)} status="active" />}

        {phase === 'error' && state?.error && (
          <Alert type="error" showIcon message="Update error" description={state.error} />
        )}

        {phase === 'downloaded' && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="Update downloaded"
            description="Restart MagicLens to finish installing the new version."
          />
        )}

        {phase === 'available' && manualDownloadOnly && (
          <Alert
            type="info"
            showIcon
            message="Manual download required on macOS"
            description="Without a paid Apple Developer ID certificate, automatic install can't be verified safely on macOS. Download the DMG from the GitHub release page and install it manually - it only takes a moment."
          />
        )}

        {state?.releaseNotes && (
          <div>
            <Typography.Text strong>Release notes</Typography.Text>
            <div
              style={{
                marginTop: 8,
                maxHeight: 220,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                background: 'rgba(127,127,127,0.08)',
                borderRadius: 6,
                padding: 12
              }}
            >
              {state.releaseNotes}
            </div>
          </div>
        )}

        <Space wrap>
          <Button icon={<SyncOutlined />} loading={phase === 'checking'} onClick={() => void check()}>
            Check for updates
          </Button>
          {phase === 'available' && !isSkipped && manualDownloadOnly && (
            <Button type="primary" icon={<ExportOutlined />} onClick={() => void openReleasePage()}>
              Open GitHub release
            </Button>
          )}
          {phase === 'available' && !isSkipped && !manualDownloadOnly && (
            <Button type="primary" icon={<DownloadOutlined />} onClick={() => void download()}>
              Download update
            </Button>
          )}
          {phase === 'available' && !isSkipped && <Button onClick={() => void skip()}>Skip this version</Button>}
          {phase === 'downloaded' && (
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => void install()}>
              Restart & install
            </Button>
          )}
        </Space>
      </Space>
    </Modal>
  )
}
