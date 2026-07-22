import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import { enterpriseApi } from '../../../enterprise/api'

type Invitation = {
  id: string
  email: string
  role: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
}

function statusOf(i: Invitation): string {
  if (i.acceptedAt) return 'Accepted'
  if (i.revokedAt) return 'Revoked'
  if (new Date(i.expiresAt) < new Date()) return 'Expired'
  return 'Pending'
}

export function AdminInvitationsSection(): React.JSX.Element {
  const [rows, setRows] = useState<Invitation[]>([])
  const [open, setOpen] = useState(false)

  async function refresh() {
    setRows(await enterpriseApi<Invitation[]>('/invitations'))
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setOpen(true)}>
          Invite user
        </Button>
        <Button onClick={() => void refresh()}>Refresh</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: 'Email', dataIndex: 'email' },
          { title: 'Role', dataIndex: 'role' },
          { title: 'Status', render: (_, row) => <Tag>{statusOf(row)}</Tag> },
          {
            title: 'Expires',
            dataIndex: 'expiresAt',
            render: (v: string) => new Date(v).toLocaleString()
          },
          {
            title: 'Actions',
            render: (_, row) =>
              statusOf(row) === 'Pending' ? (
                <Space>
                  <Button
                    size="small"
                    onClick={async () => {
                      await enterpriseApi(`/invitations/${row.id}/resend`, { method: 'POST' })
                      message.success('Invitation resent (check Mailpit)')
                    }}
                  >
                    Resend
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={async () => {
                      await enterpriseApi(`/invitations/${row.id}/revoke`, { method: 'POST' })
                      message.success('Revoked')
                      void refresh()
                    }}
                  >
                    Revoke
                  </Button>
                </Space>
              ) : null
          }
        ]}
      />
      <Modal title="Invite user" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form
          layout="vertical"
          onFinish={async (values) => {
            await enterpriseApi('/invitations', { method: 'POST', body: JSON.stringify(values) })
            message.success('Invitation sent')
            setOpen(false)
            void refresh()
          }}
        >
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" initialValue="MEMBER">
            <Select
              options={['ADMIN', 'TEAM_ADMIN', 'MEMBER', 'READ_ONLY'].map((r) => ({ value: r, label: r }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Send invitation
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
