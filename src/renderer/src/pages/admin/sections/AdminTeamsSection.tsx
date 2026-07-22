import { useEffect, useState } from 'react'
import {
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message
} from 'antd'
import { enterpriseApi } from '../../../enterprise/api'

type TeamMember = { user: { id: string; email: string; name?: string }; role: string }
type TeamKube = { kubeconfig: { id: string; name: string } }
type TeamVpn = { vpnProfile: { id: string; name: string } }
type TeamPackage = { package: { id: string; name: string; type: string } }

type TeamRow = {
  id: string
  name: string
  description?: string
  members?: TeamMember[]
}

type TeamDetail = TeamRow & {
  kubeconfigs?: TeamKube[]
  vpnProfiles?: TeamVpn[]
  packages?: TeamPackage[]
}

type ResourcePackage = {
  id: string
  name: string
  description?: string
  type: 'KUBECONFIG' | 'VPN'
  kubeconfigs?: Array<{ kubeconfig: { id: string; name: string } }>
  vpnProfiles?: Array<{ vpnProfile: { id: string; name: string } }>
}

export function AdminTeamsSection(): React.JSX.Element {
  const [rows, setRows] = useState<TeamRow[]>([])
  const [policies, setPolicies] = useState<Array<{ id: string; name: string }>>([])
  const [allKubeconfigs, setAllKubeconfigs] = useState<Array<{ id: string; name: string }>>([])
  const [allVpn, setAllVpn] = useState<Array<{ id: string; name: string }>>([])
  const [packages, setPackages] = useState<ResourcePackage[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [manageTeam, setManageTeam] = useState<TeamDetail | null>(null)
  const [memberOpen, setMemberOpen] = useState(false)
  const [packageOpen, setPackageOpen] = useState(false)
  const [packageType, setPackageType] = useState<'KUBECONFIG' | 'VPN'>('KUBECONFIG')
  const [loadingDetail, setLoadingDetail] = useState(false)

  async function refresh() {
    const [teams, policyList, kc, vpn, pkgs] = await Promise.all([
      enterpriseApi<TeamRow[]>('/teams'),
      enterpriseApi<Array<{ id: string; name: string }>>('/permission-policies'),
      enterpriseApi<Array<{ id: string; name: string }>>('/kubeconfigs'),
      enterpriseApi<Array<{ id: string; name: string }>>('/vpn-profiles'),
      enterpriseApi<ResourcePackage[]>('/resource-packages')
    ])
    setRows(teams)
    setPolicies(policyList)
    setAllKubeconfigs(kc)
    setAllVpn(vpn)
    setPackages(pkgs)
  }

  async function loadTeamDetail(id: string): Promise<TeamDetail> {
    return enterpriseApi<TeamDetail>(`/teams/${id}`)
  }

  async function openManage(team: TeamRow): Promise<void> {
    setLoadingDetail(true)
    try {
      const detail = await loadTeamDetail(team.id)
      setManageTeam(detail)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function reloadManage(): Promise<void> {
    if (!manageTeam) return
    const detail = await loadTeamDetail(manageTeam.id)
    setManageTeam(detail)
    void refresh()
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Create team
        </Button>
        <Button onClick={() => setPackageOpen(true)}>Create package</Button>
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
            render: (members: TeamRow['members']) => members?.length ?? 0
          },
          {
            title: 'Actions',
            render: (_, row) => (
              <Space>
                <Button size="small" type="primary" loading={loadingDetail} onClick={() => void openManage(row)}>
                  Manage
                </Button>
                <Button
                  danger
                  size="small"
                  onClick={async () => {
                    await enterpriseApi(`/teams/${row.id}`, { method: 'DELETE' })
                    message.success('Deleted')
                    void refresh()
                  }}
                >
                  Delete
                </Button>
              </Space>
            )
          }
        ]}
      />

      <Drawer
        title={manageTeam ? `Team · ${manageTeam.name}` : 'Team'}
        open={!!manageTeam}
        onClose={() => setManageTeam(null)}
        width={720}
        destroyOnClose
      >
        {manageTeam && (
          <Tabs
            items={[
              {
                key: 'general',
                label: 'General',
                children: (
                  <Form
                    layout="vertical"
                    initialValues={{ name: manageTeam.name, description: manageTeam.description }}
                    onFinish={async (values) => {
                      await enterpriseApi(`/teams/${manageTeam.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify(values)
                      })
                      message.success('Team updated')
                      void reloadManage()
                    }}
                  >
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                      Save
                    </Button>
                  </Form>
                )
              },
              {
                key: 'members',
                label: `Members (${manageTeam.members?.length ?? 0})`,
                children: (
                  <>
                    <Button type="primary" size="small" style={{ marginBottom: 12 }} onClick={() => setMemberOpen(true)}>
                      Add member
                    </Button>
                    <Table
                      rowKey={(r) => r.user.id}
                      dataSource={manageTeam.members ?? []}
                      pagination={false}
                      columns={[
                        { title: 'Email', render: (_, r) => r.user.email },
                        { title: 'Role', dataIndex: 'role', render: (r: string) => <Tag>{r}</Tag> },
                        {
                          title: '',
                          render: (_, r) => (
                            <Button
                              danger
                              size="small"
                              onClick={async () => {
                                await enterpriseApi(`/teams/${manageTeam.id}/members/${r.user.id}`, {
                                  method: 'DELETE'
                                })
                                message.success('Removed')
                                void reloadManage()
                              }}
                            >
                              Remove
                            </Button>
                          )
                        }
                      ]}
                    />
                  </>
                )
              },
              {
                key: 'kubeconfigs',
                label: `Kubeconfigs (${manageTeam.kubeconfigs?.length ?? 0})`,
                children: (
                  <>
                    <Select
                      style={{ width: '100%', marginBottom: 12 }}
                      placeholder="Assign kubeconfig to team"
                      options={allKubeconfigs.map((k) => ({ value: k.id, label: k.name }))}
                      onSelect={async (kubeconfigId) => {
                        await enterpriseApi(`/kubeconfigs/${kubeconfigId}/teams`, {
                          method: 'POST',
                          body: JSON.stringify({ teamId: manageTeam.id })
                        })
                        message.success('Kubeconfig assigned')
                        void reloadManage()
                      }}
                    />
                    <Table
                      rowKey={(r) => r.kubeconfig.id}
                      dataSource={manageTeam.kubeconfigs ?? []}
                      pagination={false}
                      columns={[
                        { title: 'Name', render: (_, r) => r.kubeconfig.name },
                        {
                          title: '',
                          render: (_, r) => (
                            <Button
                              danger
                              size="small"
                              onClick={async () => {
                                await enterpriseApi(
                                  `/kubeconfigs/${r.kubeconfig.id}/teams/${manageTeam.id}`,
                                  { method: 'DELETE' }
                                )
                                message.success('Unassigned')
                                void reloadManage()
                              }}
                            >
                              Remove
                            </Button>
                          )
                        }
                      ]}
                    />
                  </>
                )
              },
              {
                key: 'vpn',
                label: `VPN (${manageTeam.vpnProfiles?.length ?? 0})`,
                children: (
                  <>
                    <Select
                      style={{ width: '100%', marginBottom: 12 }}
                      placeholder="Assign VPN profile to team"
                      options={allVpn.map((v) => ({ value: v.id, label: v.name }))}
                      onSelect={async (vpnProfileId) => {
                        await enterpriseApi(`/vpn-profiles/${vpnProfileId}/teams`, {
                          method: 'POST',
                          body: JSON.stringify({ teamId: manageTeam.id })
                        })
                        message.success('VPN assigned')
                        void reloadManage()
                      }}
                    />
                    <Table
                      rowKey={(r) => r.vpnProfile.id}
                      dataSource={manageTeam.vpnProfiles ?? []}
                      pagination={false}
                      columns={[
                        { title: 'Name', render: (_, r) => r.vpnProfile.name },
                        {
                          title: '',
                          render: (_, r) => (
                            <Button
                              danger
                              size="small"
                              onClick={async () => {
                                await enterpriseApi(
                                  `/vpn-profiles/${r.vpnProfile.id}/teams/${manageTeam.id}`,
                                  { method: 'DELETE' }
                                )
                                message.success('Unassigned')
                                void reloadManage()
                              }}
                            >
                              Remove
                            </Button>
                          )
                        }
                      ]}
                    />
                  </>
                )
              },
              {
                key: 'packages',
                label: `Packages (${manageTeam.packages?.length ?? 0})`,
                children: (
                  <>
                    <Typography.Paragraph type="secondary">
                      Assign a kubeconfig or VPN package — all items in the package are added to this team.
                    </Typography.Paragraph>
                    <Select
                      style={{ width: '100%', marginBottom: 12 }}
                      placeholder="Assign package to team"
                      options={packages.map((p) => ({
                        value: p.id,
                        label: `${p.name} (${p.type})`
                      }))}
                      onSelect={async (packageId) => {
                        await enterpriseApi(`/resource-packages/${packageId}/teams`, {
                          method: 'POST',
                          body: JSON.stringify({ teamId: manageTeam.id })
                        })
                        message.success('Package assigned — resources linked to team')
                        void reloadManage()
                      }}
                    />
                    <Table
                      rowKey={(r) => r.package.id}
                      dataSource={manageTeam.packages ?? []}
                      pagination={false}
                      columns={[
                        {
                          title: 'Package',
                          render: (_, r) => (
                            <Space>
                              {r.package.name}
                              <Tag>{r.package.type}</Tag>
                            </Space>
                          )
                        },
                        {
                          title: '',
                          render: (_, r) => (
                            <Button
                              danger
                              size="small"
                              onClick={async () => {
                                await enterpriseApi(
                                  `/resource-packages/${r.package.id}/teams/${manageTeam.id}`,
                                  { method: 'DELETE' }
                                )
                                message.success('Package unlinked')
                                void reloadManage()
                              }}
                            >
                              Remove
                            </Button>
                          )
                        }
                      ]}
                    />
                  </>
                )
              }
            ]}
          />
        )}
      </Drawer>

      <Modal title="Create team" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null}>
        <Form
          layout="vertical"
          onFinish={async (values) => {
            await enterpriseApi('/teams', { method: 'POST', body: JSON.stringify(values) })
            message.success('Created')
            setCreateOpen(false)
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

      <Modal
        title={`Add member · ${manageTeam?.name ?? ''}`}
        open={memberOpen}
        onCancel={() => setMemberOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          initialValues={{ role: 'MEMBER' }}
          onFinish={async (values) => {
            if (!manageTeam) return
            await enterpriseApi(`/teams/${manageTeam.id}/members`, {
              method: 'POST',
              body: JSON.stringify(values)
            })
            message.success('Member added')
            setMemberOpen(false)
            void reloadManage()
          }}
        >
          <Form.Item name="email" label="User email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="user@company.com" />
          </Form.Item>
          <Form.Item name="role" label="Team role">
            <Select
              options={[
                { value: 'MEMBER', label: 'MEMBER' },
                { value: 'ADMIN', label: 'ADMIN' }
              ]}
            />
          </Form.Item>
          <Form.Item name="policyId" label="Permission policy (optional)">
            <Select
              allowClear
              options={policies.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Attach a policy"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Add to team
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Create resource package"
        open={packageOpen}
        onCancel={() => setPackageOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          initialValues={{ type: 'KUBECONFIG' }}
          onFinish={async (values) => {
            const body = {
              name: values.name,
              description: values.description,
              type: values.type,
              kubeconfigIds: values.type === 'KUBECONFIG' ? values.itemIds ?? [] : undefined,
              vpnProfileIds: values.type === 'VPN' ? values.itemIds ?? [] : undefined
            }
            await enterpriseApi('/resource-packages', {
              method: 'POST',
              body: JSON.stringify(body)
            })
            message.success('Package created')
            setPackageOpen(false)
            void refresh()
          }}
        >
          <Form.Item name="name" label="Package name" rules={[{ required: true }]}>
            <Input placeholder="Production access bundle" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'KUBECONFIG', label: 'Kubeconfig package' },
                { value: 'VPN', label: 'VPN package' }
              ]}
              onChange={(v) => setPackageType(v)}
            />
          </Form.Item>
          <Form.Item name="itemIds" label={packageType === 'KUBECONFIG' ? 'Kubeconfigs' : 'VPN profiles'}>
            <Select
              mode="multiple"
              options={
                packageType === 'KUBECONFIG'
                  ? allKubeconfigs.map((k) => ({ value: k.id, label: k.name }))
                  : allVpn.map((v) => ({ value: v.id, label: v.name }))
              }
              placeholder="Select items to include"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Create package
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
