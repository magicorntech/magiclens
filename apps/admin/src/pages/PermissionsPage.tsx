import { useEffect, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd'
import { api } from '../api'

export function PermissionsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [open, setOpen] = useState(false)

  async function refresh() {
    setRows(await api('/permission-policies'))
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="ml-panel">
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setOpen(true)}>
          Create policy
        </Button>
        <Button onClick={() => void refresh()}>Refresh</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          {
            title: 'Effect',
            dataIndex: 'effect',
            render: (v: string) => <Tag color={v === 'ALLOW' ? 'green' : 'red'}>{v}</Tag>
          },
          { title: 'Priority', dataIndex: 'priority', width: 100 },
          {
            title: 'Actions',
            dataIndex: 'actionsJson',
            render: (v: string[]) => (Array.isArray(v) ? v.join(', ') : String(v))
          },
          { title: 'Resource', dataIndex: 'resourceKind' },
          { title: 'Namespace', dataIndex: 'namespacePattern' }
        ]}
      />
      <Modal title="Create policy" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form
          layout="vertical"
          initialValues={{ effect: 'ALLOW', priority: 100, actions: 'get,list,watch' }}
          onFinish={async (values) => {
            await api('/permission-policies', {
              method: 'POST',
              body: JSON.stringify({
                ...values,
                actions: String(values.actions)
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              })
            })
            message.success('Created')
            setOpen(false)
            void refresh()
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="effect" label="Effect">
            <Select options={['ALLOW', 'DENY'].map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="actions" label="Actions (comma-separated)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="resourceKind" label="Resource kind">
            <Input placeholder="Deployments" />
          </Form.Item>
          <Form.Item name="namespacePattern" label="Namespace pattern">
            <Input placeholder="prod-*" />
          </Form.Item>
          <Form.Item name="priority" label="Priority">
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
