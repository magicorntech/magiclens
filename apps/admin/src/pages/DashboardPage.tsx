import { useEffect, useState } from 'react'
import { Table, Typography } from 'antd'
import { api } from '../api'

export function DashboardPage() {
  const [stats, setStats] = useState({ users: 0, invitations: 0, teams: 0, clusters: 0 })
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
    void (async () => {
      const [users, invitations, teams, kubeconfigs, logs] = await Promise.all([
        api<unknown[]>('/users'),
        api<Array<{ acceptedAt: string | null; revokedAt: string | null; expiresAt: string }>>('/invitations'),
        api<unknown[]>('/teams'),
        api<unknown[]>('/kubeconfigs'),
        api<Array<Record<string, unknown>>>('/audit-logs?limit=8')
      ])
      const pending = invitations.filter(
        (i) => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt) > new Date()
      )
      setStats({
        users: users.length,
        invitations: pending.length,
        teams: teams.length,
        clusters: kubeconfigs.length
      })
      setAudit(logs)
    })()
  }, [])

  return (
    <>
      <div className="ml-card-grid">
        <div className="ml-stat">
          <strong>{stats.users}</strong>
          <span>Users</span>
        </div>
        <div className="ml-stat">
          <strong>{stats.invitations}</strong>
          <span>Pending invitations</span>
        </div>
        <div className="ml-stat">
          <strong>{stats.teams}</strong>
          <span>Teams</span>
        </div>
        <div className="ml-stat">
          <strong>{stats.clusters}</strong>
          <span>Shared clusters</span>
        </div>
      </div>
      <div className="ml-panel">
        <Typography.Title level={5}>Recent administrative actions</Typography.Title>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={audit}
          columns={[
            { title: 'Action', dataIndex: 'action' },
            { title: 'Result', dataIndex: 'result', width: 100 },
            { title: 'Resource', dataIndex: 'resourceName' },
            {
              title: 'When',
              dataIndex: 'createdAt',
              render: (v: string) => new Date(v).toLocaleString()
            }
          ]}
        />
      </div>
    </>
  )
}
