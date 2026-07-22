import { useEffect, useState } from 'react'
import { Button, Input, Space, Table } from 'antd'
import { api } from '../api'

export function AuditPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [action, setAction] = useState('')

  async function refresh(filter = action) {
    const qs = filter ? `?action=${encodeURIComponent(filter)}` : ''
    setRows(await api(`/audit-logs${qs}`))
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="ml-panel">
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Filter by action"
          allowClear
          onSearch={(v) => {
            setAction(v)
            void refresh(v)
          }}
          style={{ width: 280 }}
        />
        <Button onClick={() => void refresh()}>Refresh</Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: 'Action', dataIndex: 'action' },
          { title: 'Result', dataIndex: 'result', width: 100 },
          { title: 'Resource type', dataIndex: 'resourceType' },
          { title: 'Resource', dataIndex: 'resourceName' },
          {
            title: 'When',
            dataIndex: 'createdAt',
            render: (v: string) => new Date(v).toLocaleString()
          }
        ]}
      />
    </div>
  )
}
