import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import { api } from '../api'

export function KubeconfigsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [open, setOpen] = useState(false)

  async function refresh() {
    const [k, t] = await Promise.all([
      api<Array<Record<string, unknown>>>('/kubeconfigs'),
      api<Array<{ id: string; name: string }>>('/teams')
    ])
    setRows(k)
    setTeams(t)
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="ml-panel">
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setOpen(true)}>
          Upload metadata
        </Button>
        <Button onClick={() => void refresh()}>Refresh</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          {
            title: 'Visibility',
            dataIndex: 'visibility',
            render: (v: string) => <Tag>{v}</Tag>
          },
          { title: 'Endpoint', dataIndex: 'serverEndpoint' },
          { title: 'Environment', dataIndex: 'environment' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v}</Tag>
          },
          {
            title: 'Actions',
            render: (_, row) => (
              <Space>
                <Button
                  size="small"
                  onClick={async () => {
                    await api(`/kubeconfigs/${row.id}/test`, { method: 'POST' })
                    message.success('Validation queued')
                  }}
                >
                  Test
                </Button>
                <Select
                  placeholder="Assign team"
                  style={{ width: 160 }}
                  options={teams.map((t) => ({ value: t.id, label: t.name }))}
                  onSelect={async (teamId) => {
                    await api(`/kubeconfigs/${row.id}/teams`, {
                      method: 'POST',
                      body: JSON.stringify({ teamId })
                    })
                    message.success('Assigned')
                  }}
                />
              </Space>
            )
          }
        ]}
      />
      <Modal title="Add kubeconfig metadata" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form
          layout="vertical"
          initialValues={{ visibility: 'TEAM' }}
          onFinish={async (values) => {
            await api('/kubeconfigs', { method: 'POST', body: JSON.stringify(values) })
            message.success('Created')
            setOpen(false)
            void refresh()
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="visibility" label="Visibility">
            <Select options={['PERSONAL', 'TEAM', 'ORGANIZATION'].map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="serverEndpoint" label="Server endpoint">
            <Input placeholder="https://kubernetes.example" />
          </Form.Item>
          <Form.Item name="environment" label="Environment">
            <Input placeholder="development" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Save
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
