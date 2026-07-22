import { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  List,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import {
  KeyRound,
  Network,
  RefreshCw,
  Shield,
  Bell,
  LayoutDashboard
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useClusterStore } from '../stores/clusterStore'
import { enterpriseApi, type UserNotification } from '../enterprise/api'
import { Icon } from '../components/ui/Icon'

function roleColor(role?: string): string {
  switch (role) {
    case 'OWNER':
      return 'gold'
    case 'ADMIN':
      return 'purple'
    case 'TEAM_ADMIN':
      return 'blue'
    case 'READ_ONLY':
      return 'default'
    default:
      return 'cyan'
  }
}

function accessLabel(mode?: string): { text: string; color: string } {
  switch (mode) {
    case 'readonly':
      return { text: 'Read only', color: 'orange' }
    case 'custom':
      return { text: 'Custom resources', color: 'geekblue' }
    default:
      return { text: 'Full access', color: 'green' }
  }
}

export function ProfilePage(): React.JSX.Element {
  const me = useAuthStore((s) => s.me)
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword)
  const changePassword = useAuthStore((s) => s.changePassword)
  const syncAssignments = useAuthStore((s) => s.syncAssignments)
  const markNotificationsRead = useAuthStore((s) => s.markNotificationsRead)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [pwdLoading, setPwdLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  async function refresh() {
    await syncAssignments()
    const list = await enterpriseApi<UserNotification[]>('/notifications')
    setNotifications(list)
  }

  useEffect(() => {
    void refresh()
  }, [])

  if (!me) {
    return (
      <div className="ml-profile-page">
        <Alert type="info" showIcon message="Sign in to view your profile and assigned resources." />
      </div>
    )
  }

  const access = accessLabel(me.accessMode)
  const initials = me.name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="ml-profile-page">
      <div className="ml-profile-hero">
        <div className="ml-profile-hero-main">
          <Avatar size={64} className="ml-profile-avatar">
            {initials || '?'}
          </Avatar>
          <div>
            <Typography.Title level={3} className="ml-profile-name">
              {me.name}
            </Typography.Title>
            <Typography.Text type="secondary">{me.email}</Typography.Text>
            <div className="ml-profile-tags">
              <Tag color="blue">{me.organization?.name ?? 'No organization'}</Tag>
              <Tag color={roleColor(me.organization?.role)}>{me.organization?.role ?? '—'}</Tag>
              <Tag color={access.color}>{access.text}</Tag>
              <Tag>{me.status}</Tag>
            </div>
          </div>
        </div>
        <Space wrap>
          <Button
            icon={<Icon icon={RefreshCw} variant="detail" />}
            loading={syncing}
            onClick={async () => {
              setSyncing(true)
              try {
                const { syncOrgAssignments } = await import('../enterprise/sync')
                const synced = await syncOrgAssignments()
                await refresh()
                message.success(
                  `Synced ${synced.kubeconfigs} cluster(s) · ${synced.vpn} VPN profile(s)`
                )
              } catch (err) {
                message.error(err instanceof Error ? err.message : String(err))
              } finally {
                setSyncing(false)
              }
            }}
          >
            Sync assignments
          </Button>
          {isAdmin() && (
            <Button
              type="primary"
              icon={<Icon icon={LayoutDashboard} variant="detail" />}
              onClick={() => setActiveView('admin')}
            >
              Admin Console
            </Button>
          )}
        </Space>
      </div>

      {mustChangePassword && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="You must set a new password before continuing."
        />
      )}

      {me.accessMode === 'custom' && (me.hiddenResourceKinds?.length ?? 0) > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Some Magiclens resources are hidden for your account"
          description={
            <span>
              Hidden: {me.hiddenResourceKinds!.join(', ')}. Contact an admin to change access.
            </span>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            className="ml-profile-card"
            title={
              <Space>
                <Icon icon={KeyRound} variant="detail" />
                Assigned clusters
              </Space>
            }
            extra={<Tag>{me.kubeconfigs.length}</Tag>}
          >
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={me.kubeconfigs}
              locale={{ emptyText: 'No clusters assigned yet' }}
              columns={[
                { title: 'Name', dataIndex: 'name' },
                {
                  title: 'Visibility',
                  dataIndex: 'visibility',
                  render: (v: string) => <Tag>{v}</Tag>
                },
                { title: 'Endpoint', dataIndex: 'serverEndpoint', ellipsis: true },
                { title: 'Env', dataIndex: 'environment', width: 100 },
                {
                  title: 'Device',
                  width: 110,
                  render: (_, row) => {
                    const local = useClusterStore
                      .getState()
                      .clusters.some((c) => c.orgKubeconfigId === row.id)
                    if (local) return <Tag color="success">Synced</Tag>
                    if (row.hasConfig === false) return <Tag>No credentials</Tag>
                    return <Tag color="warning">Pending</Tag>
                  }
                }
              ]}
            />
          </Card>

          <Card
            className="ml-profile-card"
            style={{ marginTop: 16 }}
            title={
              <Space>
                <Icon icon={Network} variant="detail" />
                Assigned VPN profiles
              </Space>
            }
            extra={
              <Button type="link" size="small" onClick={() => setActiveView('vpn')}>
                VPN manager →
              </Button>
            }
          >
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={me.vpnProfiles ?? []}
              locale={{ emptyText: 'No VPN profiles assigned' }}
              columns={[
                { title: 'Name', dataIndex: 'name' },
                {
                  title: 'Provider',
                  dataIndex: 'provider',
                  render: (v: string) => <Tag>{v}</Tag>
                },
                { title: 'Server', dataIndex: 'serverHost' },
                { title: 'Protocol', dataIndex: 'protocol', width: 100 }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            className="ml-profile-card"
            title={
              <Space>
                <Icon icon={Shield} variant="detail" />
                Security
              </Space>
            }
          >
            <Form
              layout="vertical"
              onFinish={async (values) => {
                setPwdLoading(true)
                try {
                  await changePassword(values.newPassword, values.currentPassword)
                  message.success('Password updated')
                } catch (err) {
                  message.error(err instanceof Error ? err.message : String(err))
                } finally {
                  setPwdLoading(false)
                }
              }}
            >
              {!mustChangePassword && (
                <Form.Item
                  name="currentPassword"
                  label="Current password"
                  rules={[{ required: true }]}
                >
                  <Input.Password />
                </Form.Item>
              )}
              <Form.Item
                name="newPassword"
                label="New password"
                rules={[{ required: true, min: 8 }]}
              >
                <Input.Password />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={pwdLoading} block>
                Update password
              </Button>
            </Form>
          </Card>

          <Card
            className="ml-profile-card"
            style={{ marginTop: 16 }}
            title={
              <Space>
                <Icon icon={Bell} variant="detail" />
                Notifications
              </Space>
            }
            extra={
              <Button
                size="small"
                type="link"
                onClick={async () => {
                  await markNotificationsRead()
                  void refresh()
                }}
              >
                Mark all read
              </Button>
            }
          >
            <List
              size="small"
              dataSource={notifications}
              locale={{ emptyText: 'No notifications' }}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <span>
                        {item.title}
                        {!item.readAt && (
                          <Tag color="blue" style={{ marginLeft: 8 }}>
                            new
                          </Tag>
                        )}
                      </span>
                    }
                    description={item.body ?? item.type}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
