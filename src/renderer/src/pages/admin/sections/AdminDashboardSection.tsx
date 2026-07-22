import { useEffect, useState } from 'react'
import { Table, Typography } from 'antd'
import { enterpriseApi } from '../../../enterprise/api'

export function AdminDashboardSection(): React.JSX.Element {
  const [stats, setStats] = useState({ users: 0, invitations: 0, teams: 0, clusters: 0 })
  const [audit, setAudit] = useState<Array<Record<string, unknown>>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const [users, invitations, teams, kubeconfigs, logs] = await Promise.all([
          enterpriseApi<unknown[]>('/users'),
          enterpriseApi<Array<{ acceptedAt: string | null; revokedAt: string | null; expiresAt: string }>>(
            '/invitations'
          ),
          enterpriseApi<unknown[]>('/teams'),
          enterpriseApi<unknown[]>('/kubeconfigs'),
          enterpriseApi<Array<Record<string, unknown>>>('/audit-logs?limit=8')
        ])
        setStats({
          users: users.length,
          invitations: invitations.filter(
            (i) => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt) > new Date()
          ).length,
          teams: teams.length,
          clusters: kubeconfigs.length
        })
        setAudit(logs)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [])

  return (
    <div>
      {error && <Typography.Text type="danger">{error}</Typography.Text>}
      <div className="ml-admin-stat-grid">
        <div className="ml-admin-stat">
          <strong>{stats.users}</strong>
          <span>Users</span>
        </div>
        <div className="ml-admin-stat">
          <strong>{stats.invitations}</strong>
          <span>Pending invitations</span>
        </div>
        <div className="ml-admin-stat">
          <strong>{stats.teams}</strong>
          <span>Teams</span>
        </div>
        <div className="ml-admin-stat">
          <strong>{stats.clusters}</strong>
          <span>Shared clusters</span>
        </div>
      </div>
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
  )
}
