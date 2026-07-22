import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { enterpriseApi } from '../../../enterprise/api'

type KubeconfigRow = {
  id: string
  name: string
  visibility: string
  serverEndpoint?: string
  environment?: string
  status: string
  hasConfig?: boolean
  teams?: Array<{ team: { id: string; name: string } }>
}

export function AdminKubeconfigsSection(): React.JSX.Element {
  const [rows, setRows] = useState<KubeconfigRow[]>([])
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<KubeconfigRow | null>(null)

  async function refresh() {
    const [k, t] = await Promise.all([
      enterpriseApi<KubeconfigRow[]>('/kubeconfigs'),
      enterpriseApi<Array<{ id: string; name: string }>>('/teams')
    ])
    setRows(k)
    setTeams(t)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function loadDetail(id: string): Promise<void> {
    const item = await enterpriseApi<KubeconfigRow>(`/kubeconfigs/${id}`)
    setDetail(item)
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setOpen(true)}>
          Add kubeconfig
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
            title: 'Config',
            dataIndex: 'hasConfig',
            render: (v?: boolean) => (
              <Tag color={v ? 'green' : 'default'}>{v ? 'uploaded' : 'metadata only'}</Tag>
            )
          },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v}</Tag>
          },
          {
            title: 'Teams',
            render: (_, row) => (
              <Button size="small" type="link" onClick={() => void loadDetail(row.id)}>
                View / assign
              </Button>
            )
          }
        ]}
      />

      <Modal title="Add kubeconfig" open={open} onCancel={() => setOpen(false)} footer={null} width={560}>
        <Form
          layout="vertical"
          initialValues={{ visibility: 'TEAM' }}
          onFinish={async (values) => {
            await enterpriseApi('/kubeconfigs', { method: 'POST', body: JSON.stringify(values) })
            message.success('Kubeconfig created')
            setOpen(false)
            void refresh()
          }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Production GCP" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>
          <Form.Item name="visibility" label="Visibility">
            <Select options={['TEAM', 'ORGANIZATION'].map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="serverEndpoint" label="Server endpoint">
            <Input placeholder="https://cluster.example.com" />
          </Form.Item>
          <Form.Item name="environment" label="Environment">
            <Input placeholder="production" />
          </Form.Item>
          <Form.Item
            name="content"
            label="Kubeconfig YAML"
            extra="Paste the full kubeconfig. Team members receive contexts on login sync."
          >
            <Input.TextArea rows={10} placeholder="apiVersion: v1..." />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Save
          </Button>
        </Form>
      </Modal>

      <Modal
        title={`Kubeconfig · ${detail?.name ?? ''}`}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={520}
      >
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Typography.Text type="secondary">Assigned teams</Typography.Text>
              <div style={{ marginTop: 8 }}>
                {detail.teams?.length ? (
                  detail.teams.map((t) => <Tag key={t.team.id}>{t.team.name}</Tag>)
                ) : (
                  <Typography.Text type="secondary">No teams yet</Typography.Text>
                )}
              </div>
            </div>
            <Select
              placeholder="Assign to team"
              style={{ width: '100%' }}
              options={teams.map((t) => ({ value: t.id, label: t.name }))}
              onSelect={async (teamId) => {
                await enterpriseApi(`/kubeconfigs/${detail.id}/teams`, {
                  method: 'POST',
                  body: JSON.stringify({ teamId })
                })
                message.success('Assigned to team — members will sync on login')
                await loadDetail(detail.id)
                void refresh()
              }}
            />
          </Space>
        )}
      </Modal>
    </div>
  )
}
