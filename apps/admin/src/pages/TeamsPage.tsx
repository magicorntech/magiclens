import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Space, Table, message } from 'antd'
import { api } from '../api'

export function TeamsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [open, setOpen] = useState(false)

  async function refresh() {
    setRows(await api('/teams'))
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="ml-panel">
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setOpen(true)}>
          Create team
        </Button>
        <Button onClick={() => void refresh()}>Refresh</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Description', dataIndex: 'description' },
          {
            title: 'Members',
            dataIndex: 'members',
            render: (members: Array<{ user: { email: string } }>) =>
              members?.map((m) => m.user.email).join(', ')
          },
          {
            title: 'Actions',
            render: (_, row) => (
              <Button
                danger
                size="small"
                onClick={async () => {
                  await api(`/teams/${row.id}`, { method: 'DELETE' })
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
      <Modal title="Create team" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form
          layout="vertical"
          onFinish={async (values) => {
            await api('/teams', { method: 'POST', body: JSON.stringify(values) })
            message.success('Created')
            setOpen(false)
            void refresh()
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Create
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
