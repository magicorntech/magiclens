import { useEffect, useState } from 'react'
import { Button, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import { api } from '../api'

type Member = {
  id: string
  role: string
  user: { id: string; name: string; email: string; status: string }
}

export function UsersPage() {
  const [rows, setRows] = useState<Member[]>([])
  const [q, setQ] = useState('')
  const [roleModal, setRoleModal] = useState<Member | null>(null)
  const [role, setRole] = useState('MEMBER')

  async function refresh(query = q) {
    const data = await api<Member[]>(`/users${query ? `?q=${encodeURIComponent(query)}` : ''}`)
    setRows(data)
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="ml-panel">
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search users"
          allowClear
          onSearch={(value) => {
            setQ(value)
            void refresh(value)
          }}
          style={{ width: 280 }}
        />
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
          { title: 'Role', dataIndex: 'role' },
          {
            title: 'Actions',
            render: (_, row) => (
              <Space>
                <Button size="small" onClick={() => { setRoleModal(row); setRole(row.role) }}>
                  Edit role
                </Button>
                <Button
                  size="small"
                  onClick={async () => {
                    await api(`/users/${row.user.id}/enable`, { method: 'POST' })
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
                    await api(`/users/${row.user.id}/disable`, { method: 'POST' })
                    message.success('Disabled')
                    void refresh()
                  }}
                >
                  Disable
                </Button>
                <Button
                  size="small"
                  onClick={async () => {
                    await api(`/users/${row.user.id}/revoke-sessions`, { method: 'POST' })
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
        title="Assign role"
        open={!!roleModal}
        onCancel={() => setRoleModal(null)}
        onOk={async () => {
          if (!roleModal) return
          await api(`/users/${roleModal.user.id}/roles`, {
            method: 'POST',
            body: JSON.stringify({ role })
          })
          message.success('Role updated')
          setRoleModal(null)
          void refresh()
        }}
      >
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
    </div>
  )
}
