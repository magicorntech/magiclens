import { useEffect, useRef, useState } from 'react'
import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography, Upload, message } from 'antd'
import { Upload as UploadIcon } from 'lucide-react'
import { detectVpnProvider, parseVpnConfigMeta } from '@shared/types/vpn'
import { enterpriseApi } from '../../../enterprise/api'
import { Icon } from '../../../components/ui/Icon'
import { UserSearchSelect } from '../../../components/admin/UserSearchSelect'

type VpnRow = {
  id: string
  name: string
  description?: string
  provider?: string
  serverHost?: string
  protocol?: string
  hasConfig?: boolean
  users?: Array<{ user: { id: string; email: string } }>
  teams?: Array<{ team: { id: string; name: string } }>
}

type TeamOption = { id: string; name: string }

async function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function profileNameFromFile(filename: string): string {
  return filename.replace(/\.(ovpn|conf)$/i, '')
}

export function AdminVpnSection(): React.JSX.Element {
  const [rows, setRows] = useState<VpnRow[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [assignVpn, setAssignVpn] = useState<VpnRow | null>(null)
  const [detailVpn, setDetailVpn] = useState<VpnRow | null>(null)
  const [uploading, setUploading] = useState(false)
  const bulkInputRef = useRef<HTMLInputElement>(null)
  const [form] = Form.useForm()
  const [configPreview, setConfigPreview] = useState('')

  async function refresh() {
    const [vpn, teamList] = await Promise.all([
      enterpriseApi<VpnRow[]>('/vpn-profiles'),
      enterpriseApi<TeamOption[]>('/teams')
    ])
    setRows(vpn)
    setTeams(teamList)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function createFromConfig(
    name: string,
    config: string,
    filename?: string
  ): Promise<boolean> {
    const meta = parseVpnConfigMeta(config, filename ?? name)
    const provider = detectVpnProvider(config, meta.passwordMode ? 'pritunl' : undefined, filename ?? name)
    await enterpriseApi('/vpn-profiles', {
      method: 'POST',
      body: JSON.stringify({
        name: name || meta.suggestedName || 'VPN profile',
        provider,
        serverHost: meta.serverHost,
        protocol: meta.protocol,
        config
      })
    })
    return true
  }

  async function uploadFiles(files: File[]): Promise<void> {
    if (files.length === 0) return
    setUploading(true)
    let created = 0
    try {
      for (const file of files) {
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.ovpn') && !ext.endsWith('.conf')) {
          message.warning(`Skipped ${file.name} — use .ovpn or .conf`)
          continue
        }
        const config = await readFileText(file)
        if (!config.trim()) continue
        await createFromConfig(profileNameFromFile(file.name), config, file.name)
        created++
      }
      if (created > 0) {
        message.success(`Added ${created} VPN profile(s)`)
        void refresh()
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  async function applyPickedFile(file: File): Promise<void> {
    const config = await readFileText(file)
    const meta = parseVpnConfigMeta(config, file.name)
    const provider = detectVpnProvider(config, undefined, file.name)
    form.setFieldsValue({
      name: form.getFieldValue('name') || profileNameFromFile(file.name),
      provider,
      serverHost: meta.serverHost,
      protocol: meta.protocol,
      config
    })
    setConfigPreview(config)
  }

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Add VPN profile
        </Button>
        <Button
          icon={<Icon icon={UploadIcon} variant="detail" />}
          loading={uploading}
          onClick={() => bulkInputRef.current?.click()}
        >
          Upload .ovpn / .conf files
        </Button>
        <input
          ref={bulkInputRef}
          type="file"
          accept=".ovpn,.conf"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            void uploadFiles(files)
          }}
        />
        <Button onClick={() => void refresh()}>Refresh</Button>
      </Space>

      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Upload one or more .ovpn files (OpenVPN / Pritunl). Assign profiles to teams so all team
        members sync them on login, or assign directly to individual users.
      </Typography.Paragraph>

      <Table
        rowKey="id"
        dataSource={rows}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Provider', dataIndex: 'provider', render: (v?: string) => <Tag>{v || '—'}</Tag> },
          { title: 'Server', dataIndex: 'serverHost' },
          {
            title: 'Config',
            dataIndex: 'hasConfig',
            render: (v?: boolean) => (
              <Tag color={v ? 'green' : 'default'}>{v ? 'file uploaded' : 'missing'}</Tag>
            )
          },
          {
            title: 'Teams',
            render: (_, row) =>
              row.teams?.length
                ? row.teams.map((t) => <Tag key={t.team.id}>{t.team.name}</Tag>)
                : '—'
          },
          {
            title: 'Users',
            render: (_, row) => row.users?.map((u) => u.user.email).join(', ') || '—'
          },
          {
            title: 'Actions',
            render: (_, row) => (
              <Space wrap>
                <Button size="small" onClick={() => setDetailVpn(row)}>
                  Teams
                </Button>
                <Button size="small" onClick={() => setAssignVpn(row)}>
                  Assign user
                </Button>
                <Button
                  danger
                  size="small"
                  onClick={async () => {
                    await enterpriseApi(`/vpn-profiles/${row.id}`, { method: 'DELETE' })
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

      <Modal
        title="Add VPN profile"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false)
          form.resetFields()
          setConfigPreview('')
        }}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ provider: 'openvpn' }}
          onFinish={async (values) => {
            await enterpriseApi('/vpn-profiles', { method: 'POST', body: JSON.stringify(values) })
            message.success('Created')
            setCreateOpen(false)
            form.resetFields()
            setConfigPreview('')
            void refresh()
          }}
        >
          <Form.Item label="VPN config file">
            <Upload
              accept=".ovpn,.conf"
              maxCount={1}
              beforeUpload={(file) => {
                void applyPickedFile(file as unknown as File)
                return false
              }}
              showUploadList={false}
            >
              <Button icon={<Icon icon={UploadIcon} variant="detail" />}>Choose .ovpn / .conf file</Button>
            </Upload>
            {configPreview && (
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                File loaded — fields below were auto-filled. You can edit before saving.
              </Typography.Text>
            )}
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Office VPN" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>
          <Form.Item name="provider" label="Provider">
            <Select
              options={[
                { value: 'openvpn', label: 'OpenVPN (.ovpn)' },
                { value: 'pritunl', label: 'Pritunl (.ovpn)' },
                { value: 'wireguard', label: 'WireGuard (.conf)' },
                { value: 'generic', label: 'Generic' }
              ]}
            />
          </Form.Item>
          <Form.Item name="serverHost" label="Server host">
            <Input placeholder="vpn.company.com" />
          </Form.Item>
          <Form.Item name="protocol" label="Protocol">
            <Input placeholder="udp / tcp" />
          </Form.Item>
          <Form.Item
            name="config"
            label="Config"
            rules={[{ required: true, message: 'Upload a file or paste config' }]}
          >
            <Input.TextArea rows={8} placeholder="Paste .ovpn content or upload a file above" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Save profile
          </Button>
        </Form>
      </Modal>

      <Modal
        title={`Assign to team · ${detailVpn?.name ?? ''}`}
        open={!!detailVpn}
        onCancel={() => setDetailVpn(null)}
        footer={null}
        destroyOnClose
      >
        {detailVpn && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Typography.Text type="secondary">Assigned teams</Typography.Text>
              <div style={{ marginTop: 8 }}>
                {detailVpn.teams?.length ? (
                  detailVpn.teams.map((t) => <Tag key={t.team.id}>{t.team.name}</Tag>)
                ) : (
                  <Typography.Text type="secondary">No teams yet</Typography.Text>
                )}
              </div>
            </div>
            <Select
              placeholder="Add team"
              style={{ width: '100%' }}
              options={teams.map((t) => ({ value: t.id, label: t.name }))}
              onSelect={async (teamId) => {
                await enterpriseApi(`/vpn-profiles/${detailVpn.id}/teams`, {
                  method: 'POST',
                  body: JSON.stringify({ teamId })
                })
                message.success('Assigned to team — members will sync on login')
                void refresh()
                const updated = (await enterpriseApi<VpnRow[]>('/vpn-profiles')).find(
                  (r) => r.id === detailVpn.id
                )
                if (updated) setDetailVpn(updated)
              }}
            />
          </Space>
        )}
      </Modal>

      <Modal
        title={`Assign user · ${assignVpn?.name ?? ''}`}
        open={!!assignVpn}
        onCancel={() => setAssignVpn(null)}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          onFinish={async (values) => {
            if (!assignVpn) return
            await enterpriseApi(`/vpn-profiles/${assignVpn.id}/users`, {
              method: 'POST',
              body: JSON.stringify({ userId: values.userId })
            })
            message.success('Assigned — user will be notified')
            setAssignVpn(null)
            void refresh()
          }}
        >
          <Form.Item name="userId" label="User" rules={[{ required: true, message: 'Select a user' }]}>
            <UserSearchSelect />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Assign to user
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
