import { useEffect, useState } from 'react'
import { Alert, Button, Menu, Result, Spin, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  Mail,
  Network,
  Shield,
  Users,
  UsersRound
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useClusterStore } from '../stores/clusterStore'
import { Icon } from '../components/ui/Icon'
import { AdminDashboardSection } from './admin/sections/AdminDashboardSection'
import { AdminUsersSection } from './admin/sections/AdminUsersSection'
import { AdminInvitationsSection } from './admin/sections/AdminInvitationsSection'
import { AdminTeamsSection } from './admin/sections/AdminTeamsSection'
import { AdminKubeconfigsSection } from './admin/sections/AdminKubeconfigsSection'
import { AdminVpnSection } from './admin/sections/AdminVpnSection'
import { AdminPermissionsSection } from './admin/sections/AdminPermissionsSection'
import { AdminAuditSection } from './admin/sections/AdminAuditSection'

type AdminSection =
  | 'dashboard'
  | 'users'
  | 'invitations'
  | 'teams'
  | 'kubeconfigs'
  | 'vpn'
  | 'permissions'
  | 'audit'

const MENU_ITEMS: MenuProps['items'] = [
  { key: 'dashboard', icon: <Icon icon={LayoutDashboard} variant="detail" />, label: 'Dashboard' },
  { key: 'users', icon: <Icon icon={Users} variant="detail" />, label: 'Users' },
  { key: 'invitations', icon: <Icon icon={Mail} variant="detail" />, label: 'Invitations' },
  { key: 'teams', icon: <Icon icon={UsersRound} variant="detail" />, label: 'Teams' },
  { key: 'kubeconfigs', icon: <Icon icon={KeyRound} variant="detail" />, label: 'Kubeconfigs' },
  { key: 'vpn', icon: <Icon icon={Network} variant="detail" />, label: 'VPN profiles' },
  { key: 'permissions', icon: <Icon icon={Shield} variant="detail" />, label: 'Permissions' },
  { key: 'audit', icon: <Icon icon={ClipboardList} variant="detail" />, label: 'Audit logs' }
]

export function AdminConsolePage(): React.JSX.Element {
  const me = useAuthStore((s) => s.me)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const requireLogin = useAuthStore((s) => s.requireLogin)
  const offlineMode = useAuthStore((s) => s.offlineMode)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const [section, setSection] = useState<AdminSection>('dashboard')

  useEffect(() => {
    if (!isAdmin()) setSection('dashboard')
  }, [me, isAdmin])

  if (offlineMode || !me) {
    return (
      <div className="ml-admin-page">
        <Result
          status="info"
          title="Sign in required"
          subTitle="Admin Console needs an organization account with OWNER or ADMIN role."
          extra={
            <Button type="primary" onClick={() => requireLogin()}>
              Sign in
            </Button>
          }
        />
      </div>
    )
  }

  if (!isAdmin()) {
    return (
      <div className="ml-admin-page">
        <Result
          status="403"
          title="Admin access required"
          subTitle={`Your role is ${me.organization?.role ?? 'none'}. Only OWNER or ADMIN can open Admin Console.`}
          extra={
            <Button type="primary" onClick={() => setActiveView('clusters')}>
              Back to clusters
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="ml-admin-page">
      <div className="ml-admin-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Admin Console
          </Typography.Title>
          <Typography.Text type="secondary">
            {me.organization?.name ?? 'Organization'} · {me.email} · {me.organization?.role}
          </Typography.Text>
        </div>
        <Alert
          type="info"
          showIcon
          message="Changes apply to your MagicLens organization. Local kubeconfigs stay on this device."
          style={{ maxWidth: 420 }}
        />
      </div>

      <div className="ml-admin-body">
        <Menu
          mode="inline"
          selectedKeys={[section]}
          items={MENU_ITEMS}
          onClick={({ key }) => setSection(key as AdminSection)}
          className="ml-admin-menu"
        />
        <div className="ml-admin-content">
          <AdminSectionBody section={section} />
        </div>
      </div>
    </div>
  )
}

function AdminSectionBody({ section }: { section: AdminSection }): React.JSX.Element {
  switch (section) {
    case 'dashboard':
      return <AdminDashboardSection />
    case 'users':
      return <AdminUsersSection />
    case 'invitations':
      return <AdminInvitationsSection />
    case 'teams':
      return <AdminTeamsSection />
    case 'kubeconfigs':
      return <AdminKubeconfigsSection />
    case 'vpn':
      return <AdminVpnSection />
    case 'permissions':
      return <AdminPermissionsSection />
    case 'audit':
      return <AdminAuditSection />
    default:
      return <Spin />
  }
}
