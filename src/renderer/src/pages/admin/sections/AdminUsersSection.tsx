import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import { RESOURCE_KINDS } from '@shared/resourceKinds'
import { enterpriseApi } from '../../../enterprise/api'

type Member = {
  id: string
  role: string
  user: { id: string; name: string; email: string; status: string; mustChangePassword?: boolean }
}

type VpnRow = { id: string; name: string; provider?: string; serverHost?: string }

type AccessMode = 'full' | 'readonly' | 'custom'

export function AdminUsersSection(): React.JSX.Element {
  const [rows, setRows] = useState<Member[]>([])
  const [q, setQ] = useState('')
  const [roleModal, setRoleModal] = useState<Member | null>(null)
  const [role, setRole] = useState('MEMBER')
  const [createOpen, setCreateOpen] = useState(false)
  const [assignVpnUser, setAssignVpnUser] = useState<Member | null>(null)
  const [vpnOptions, setVpnOptions] = useState<VpnRow[]>([])
  const [accessUser, setAccessUser] = useState<Member | null>(null)
  const [accessMode, setAccessMode] = useState<AccessMode>('full')
  const [writeAccess, setWriteAccess] = useState(true)
  const [hiddenKinds, setHiddenKinds] = useState<string[]>([])
  const [accessLoading, setAccessLoading] = useState(false)

  async function refresh(query = q) {
    setRows(await enterpriseApi<Member[]>(`/users${query ? `?q=${encodeURIComponent(query)}` : ''}`))
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function openAccess(row: Member) {
    setAccessUser(row)
    setAccessLoading(true)
    try {
      const profile = await enterpriseApi<{
        mode: AccessMode
        writeAccess: boolean
        hiddenResourceKinds: string[]
      }>(`/users/${row.user.id}/access-profile`)
      setAccessMode(profile.mode)
      setWriteAccess(profile.writeAccess)
      setHiddenKinds(profile.hiddenResourceKinds ?? [])
    } finally {
      setAccessLoading(false)
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Search users by name or email"
          allowClear
          onSearch={(value) => {
            setQ(value)
            void refresh(value)
          }}
          style={{ width: 280 }}
        />
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Add user
        </Button>
        <Button onClick={() => void refresh()}>Refresh</Button>
      </Space>
      <Table
        rowKey={(r) => r.user.id}
        dataSource={rows}
        columns={[
          { title: 'Name', dataIndex: ['user', 'name'] },
          { title: 'Email', dataIndex: ['user', 'email'] },
          {
            title: 'Status',
            dataIndex: ['user', 'status'],
            render: (s: string) => <Tag>{s}</Tag>
          },
          {
            title: 'Role',
            dataIndex: 'role',
            render: (r: string) => <Tag color={r === 'READ_ONLY' ? 'orange' : undefined}>{r}</Tag>
          },
          {
            title: 'Actions',
            render: (_, row) => (
              <Space wrap>
                <Button
                  size="small"
                  onClick={() => {
                    setRoleModal(row)
                    setRole(row.role)
                  }}
                >
                  Org role
                </Button>
                <Button size="small" onClick={() => void openAccess(row)}>
                  Magiclens access
                </Button>
                <Button
                  size="small"
                  onClick={async () => {
                    setAssignVpnUser(row)
                    setVpnOptions(await enterpriseApi<VpnRow[]>('/vpn-profiles'))
                  }}
                >
                  Assign VPN
                </Button>
                <Button
                  size="small"
                  onClick={async () => {
                    const res = await enterpriseApi<{ temporaryPassword?: string }>(
                      `/users/${row.user.id}/reset-password`,
                      { method: 'POST' }
                    )
                    message.success(
                      res.temporaryPassword
                        ? `Password emailed. Dev password: ${res.temporaryPassword}`
                        : 'Temporary password emailed'
                    )
                  }}
                >
                  Reset password
                </Button>
                <Button
                  size="small"
                  onClick={async () => {
                    await enterpriseApi(`/users/${row.user.id}/enable`, { method: 'POST' })
                    message.success('Enabled')
                    void refresh()
                  }}
                >
                  Enable
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={async () => {
                    await enterpriseApi(`/users/${row.user.id}/disable`, { method: 'POST' })
                    message.success('Disabled')
                    void refresh()
                  }}
                >
                  Disable
                </Button>
                <Button
                  size="small"
                  onClick={async () => {
                    await enterpriseApi(`/users/${row.user.id}/revoke-sessions`, { method: 'POST' })
                    message.success('Sessions revoked')
                  }}
                >
                  Revoke sessions
                </Button>
              </Space>
            )
          }
        ]}
      />
      <Modal
        title="Assign organization role"
        open={!!roleModal}
        onCancel={() => setRoleModal(null)}
        onOk={async () => {
          if (!roleModal) return
          await enterpriseApi(`/users/${roleModal.user.id}/roles`, {
            method: 'POST',
            body: JSON.stringify({ role })
          })
          message.success('Role updated')
          setRoleModal(null)
          void refresh()
        }}
      >
        <Typography.Paragraph type="secondary">
          Org role controls admin console access and default Magiclens write privileges.
        </Typography.Paragraph>
        <Select
          style={{ width: '100%' }}
          value={role}
          onChange={setRole}
          options={['OWNER', 'ADMIN', 'TEAM_ADMIN', 'MEMBER', 'READ_ONLY'].map((r) => ({
            value: r,
            label: r
          }))}
        />
      </Modal>

      <Modal
        title={`Magiclens access · ${accessUser?.user.email ?? ''}`}
        open={!!accessUser}
        confirmLoading={accessLoading}
        onCancel={() => setAccessUser(null)}
        onOk={async () => {
          if (!accessUser) return
          setAccessLoading(true)
          try {
            await enterpriseApi(`/users/${accessUser.user.id}/access-profile`, {
              method: 'POST',
              body: JSON.stringify({
                mode: accessMode,
                writeAccess,
                hiddenResourceKinds: accessMode === 'custom' ? hiddenKinds : []
              })
            })
            message.success('Access profile saved')
            setAccessUser(null)
            void refresh()
          } catch (err) {
            message.error(err instanceof Error ? err.message : String(err))
          } finally {
            setAccessLoading(false)
          }
        }}
        width={520}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Select
            style={{ width: '100%' }}
            value={accessMode}
            onChange={setAccessMode}
            options={[
              { value: 'full', label: 'Full — all Magiclens resources' },
              { value: 'readonly', label: 'Read only — no Magiclens write actions' },
              { value: 'custom', label: 'Custom — hide selected resource kinds' }
            ]}
          />
          {accessMode === 'custom' && (
            <>
              <Select
                mode="multiple"
                allowClear
                style={{ width: '100%' }}
                placeholder="Resource kinds to hide"
                value={hiddenKinds}
                onChange={setHiddenKinds}
                options={RESOURCE_KINDS.map((k) => ({ value: k, label: k }))}
                optionFilterProp="label"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Text>Write access on visible resources</Typography.Text>
                <Switch checked={writeAccess} onChange={setWriteAccess} />
              </div>
            </>
          )}
        </Space>
      </Modal>

      <Modal title="Add user" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null}>
        <Form
          layout="vertical"
          initialValues={{ role: 'MEMBER' }}
          onFinish={async (values) => {
            const res = await enterpriseApi<{ temporaryPassword?: string }>('/users', {
              method: 'POST',
              body: JSON.stringify(values)
            })
            message.success(
              res.temporaryPassword
                ? `User created. Dev password: ${res.temporaryPassword} (also emailed)`
                : 'User created — temporary password emailed'
            )
            setCreateOpen(false)
            void refresh()
          }}
        >
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Display name">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role">
            <Select
              options={['ADMIN', 'TEAM_ADMIN', 'MEMBER', 'READ_ONLY'].map((r) => ({
                value: r,
                label: r
              }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Create & email password
          </Button>
        </Form>
      </Modal>

      <Modal
        title={`Assign VPN · ${assignVpnUser?.user.email ?? ''}`}
        open={!!assignVpnUser}
        onCancel={() => setAssignVpnUser(null)}
        footer={null}
      >
        <Form
          layout="vertical"
          onFinish={async (values) => {
            if (!assignVpnUser) return
            await enterpriseApi(`/vpn-profiles/${values.vpnProfileId}/users`, {
              method: 'POST',
              body: JSON.stringify({ userId: assignVpnUser.user.id })
            })
            message.success('VPN assigned')
            setAssignVpnUser(null)
          }}
        >
          <Form.Item name="vpnProfileId" label="VPN profile" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={vpnOptions.map((v) => ({
                value: v.id,
                label: `${v.name}${v.serverHost ? ` · ${v.serverHost}` : ''}`
              }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Assign
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
