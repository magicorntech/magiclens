import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import { RESOURCE_KINDS } from '@shared/resourceKinds'
import { enterpriseApi } from '../../../enterprise/api'
import { UserSearchSelect } from '../../../components/admin/UserSearchSelect'

type PolicyRow = {
  id: string
  name: string
  description?: string | null
  effect: string
  priority: number
  actionsJson: string[] | unknown
  resourceKind?: string | null
  namespacePattern?: string | null
}

type AccessMode = 'full' | 'readonly' | 'custom'

type Member = {
  id: string
  role: string
  user: { id: string; name: string; email: string; status: string }
}

export function AdminPermissionsSection(): React.JSX.Element {
  const [rows, setRows] = useState<PolicyRow[]>([])
  const [users, setUsers] = useState<Member[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [accessUserId, setAccessUserId] = useState<string>()
  const [accessMode, setAccessMode] = useState<AccessMode>('full')
  const [writeAccess, setWriteAccess] = useState(true)
  const [hiddenKinds, setHiddenKinds] = useState<string[]>([])
  const [accessLoading, setAccessLoading] = useState(false)

  async function refresh() {
    const [policies, members] = await Promise.all([
      enterpriseApi<PolicyRow[]>('/permission-policies'),
      enterpriseApi<Member[]>('/users')
    ])
    setRows(policies)
    setUsers(members)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function loadUserAccess(userId: string) {
    setAccessLoading(true)
    try {
      const profile = await enterpriseApi<{
        mode: AccessMode
        writeAccess: boolean
        hiddenResourceKinds: string[]
      }>(`/users/${userId}/access-profile`)
      setAccessMode(profile.mode)
      setWriteAccess(profile.writeAccess)
      setHiddenKinds(profile.hiddenResourceKinds ?? [])
    } finally {
      setAccessLoading(false)
    }
  }

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Magiclens resource access"
        description="Assign Full, Read only, or Custom (hide specific resource kinds) to users. This controls what appears in Magiclens — Kubernetes RBAC still applies on the cluster."
      />

      <Space wrap style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setAccessUserId(undefined)
            setAccessMode('full')
            setWriteAccess(true)
            setHiddenKinds([])
            setAssignOpen(true)
          }}
        >
          Assign access to user
        </Button>
        <Button onClick={() => setCreateOpen(true)}>Create advanced policy</Button>
        <Button onClick={() => void refresh()}>Refresh</Button>
      </Space>

      <Typography.Title level={5} style={{ marginTop: 8 }}>
        Organization members
      </Typography.Title>
      <Table
        size="small"
        rowKey={(r) => r.user.id}
        style={{ marginBottom: 24 }}
        dataSource={users}
        columns={[
          { title: 'Name', dataIndex: ['user', 'name'] },
          { title: 'Email', dataIndex: ['user', 'email'] },
          {
            title: 'Org role',
            dataIndex: 'role',
            render: (r: string) => <Tag>{r}</Tag>
          },
          {
            title: 'Actions',
            render: (_, row) => (
              <Button
                size="small"
                onClick={() => {
                  setAccessUserId(row.user.id)
                  void loadUserAccess(row.user.id)
                  setAssignOpen(true)
                }}
              >
                Magiclens access
              </Button>
            )
          }
        ]}
      />

      <Typography.Title level={5}>Policies</Typography.Title>
      <Table
        rowKey="id"
        size="small"
        dataSource={rows}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          {
            title: 'Effect',
            dataIndex: 'effect',
            render: (v: string) => <Tag color={v === 'ALLOW' ? 'green' : 'red'}>{v}</Tag>
          },
          { title: 'Resource', dataIndex: 'resourceKind', render: (v?: string) => v || '—' },
          { title: 'Priority', dataIndex: 'priority', width: 90 },
          {
            title: 'Actions',
            dataIndex: 'actionsJson',
            render: (v: string[] | unknown) => (Array.isArray(v) ? v.join(', ') : String(v))
          },
          {
            title: '',
            width: 90,
            render: (_, row) => (
              <Button
                size="small"
                danger
                onClick={async () => {
                  await enterpriseApi(`/permission-policies/${row.id}`, { method: 'DELETE' })
                  message.success('Deleted')
                  void refresh()
                }}
              >
                Delete
              </Button>
            )
          }
        ]}
      />

      <Modal
        title="Magiclens resource access"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        confirmLoading={accessLoading}
        onOk={async () => {
          if (!accessUserId) {
            message.error('Select a user')
            return
          }
          setAccessLoading(true)
          try {
            await enterpriseApi(`/users/${accessUserId}/access-profile`, {
              method: 'POST',
              body: JSON.stringify({
                mode: accessMode,
                writeAccess,
                hiddenResourceKinds: accessMode === 'custom' ? hiddenKinds : []
              })
            })
            message.success('Access profile saved')
            setAssignOpen(false)
            void refresh()
          } catch (err) {
            message.error(err instanceof Error ? err.message : String(err))
          } finally {
            setAccessLoading(false)
          }
        }}
        width={520}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Typography.Text type="secondary">User</Typography.Text>
            <UserSearchSelect
              value={accessUserId}
              onChange={(id) => {
                setAccessUserId(id)
                if (id) void loadUserAccess(id)
              }}
              style={{ marginTop: 8 }}
            />
          </div>

          <div>
            <Typography.Text type="secondary">Access mode</Typography.Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={accessMode}
              onChange={setAccessMode}
              options={[
                {
                  value: 'full',
                  label: 'Full — see and manage all Magiclens resources (cluster RBAC still applies)'
                },
                {
                  value: 'readonly',
                  label: 'Read only — view resources; block Magiclens write actions'
                },
                {
                  value: 'custom',
                  label: 'Custom — hide selected resource kinds from Magiclens'
                }
              ]}
            />
          </div>

          {accessMode === 'custom' && (
            <>
              <div>
                <Typography.Text type="secondary">Hide these resources in Magiclens</Typography.Text>
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="Select kinds to hide (e.g. Secrets, Nodes)"
                  value={hiddenKinds}
                  onChange={setHiddenKinds}
                  options={RESOURCE_KINDS.map((k) => ({ value: k, label: k }))}
                  optionFilterProp="label"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Typography.Text strong>Write access on visible resources</Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Off = read-only role for everything still visible
                  </Typography.Text>
                </div>
                <Switch checked={writeAccess} onChange={setWriteAccess} />
              </div>
            </>
          )}
        </Space>
      </Modal>

      <Modal title="Create advanced policy" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null}>
        <Form
          layout="vertical"
          initialValues={{ effect: 'ALLOW', priority: 100, actions: 'get,list,watch' }}
          onFinish={async (values) => {
            await enterpriseApi('/permission-policies', {
              method: 'POST',
              body: JSON.stringify({
                name: values.name,
                description: values.description,
                effect: values.effect,
                resourceKind: values.resourceKind || undefined,
                namespacePattern: values.namespacePattern || undefined,
                priority: values.priority,
                actions: String(values.actions)
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              })
            })
            message.success('Created')
            setCreateOpen(false)
            void refresh()
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>
          <Form.Item name="effect" label="Effect">
            <Select options={['ALLOW', 'DENY'].map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="resourceKind" label="Resource kind (optional)">
            <Select
              allowClear
              showSearch
              options={RESOURCE_KINDS.map((k) => ({ value: k, label: k }))}
            />
          </Form.Item>
          <Form.Item name="namespacePattern" label="Namespace pattern (optional)">
            <Input placeholder="prod-*" />
          </Form.Item>
          <Form.Item name="actions" label="Actions (comma-separated)" rules={[{ required: true }]}>
            <Input placeholder="get,list,watch or *" />
          </Form.Item>
          <Form.Item name="priority" label="Priority (lower = stronger)">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Create
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
