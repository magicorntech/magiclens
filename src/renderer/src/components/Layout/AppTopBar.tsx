import { Dropdown, Badge, Tooltip, message } from 'antd'
import type { MenuProps } from 'antd'
import { Bell, LogIn, LogOut, Search, Settings, Shield, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGlobalSearchStore } from '../../stores/globalSearchStore'
import { useAuthStore } from '../../stores/authStore'
import { useVpnStore } from '../../stores/vpnStore'
import { useClusterStore } from '../../stores/clusterStore'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { Icon } from '../ui/Icon'
import { SettingsModal } from './SettingsModal'
import { ThemeToggle } from './ThemeToggle'

export function AppTopBar(): React.JSX.Element {
  const openSearch = useGlobalSearchStore((s) => s.openSearch)
  const isDark = useResolvedDarkMode()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const me = useAuthStore((s) => s.me)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const logout = useAuthStore((s) => s.logout)
  const requireLogin = useAuthStore((s) => s.requireLogin)
  const syncAssignments = useAuthStore((s) => s.syncAssignments)
  const markNotificationsRead = useAuthStore((s) => s.markNotificationsRead)
  const notifications = useAuthStore((s) => s.notifications)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const isMac = navigator.platform.includes('Mac')

  useEffect(() => {
    if (!me) return
    const tick = async () => {
      try {
        const { newNotifications } = await syncAssignments()
          for (const n of newNotifications.slice(0, 3)) {
          message.info({ content: n.title, duration: 4 })
          if (n.type?.startsWith('vpn.') || n.type?.startsWith('kubeconfig.')) {
            void import('../../enterprise/sync').then((m) => m.syncOrgAssignments())
          }
        }
      } catch {
        // ignore offline sync errors
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), 30_000)
    return () => window.clearInterval(id)
  }, [me?.id])

  const accountItems: MenuProps['items'] = me
    ? [
        {
          key: 'profile-info',
          label: (
            <div>
              <div style={{ fontWeight: 600 }}>{me.name}</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{me.email}</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{me.organization?.role ?? 'No org role'}</div>
            </div>
          ),
          disabled: true
        },
        { type: 'divider' },
        {
          key: 'profile',
          icon: <Icon icon={UserRound} variant="detail" />,
          label: 'My profile',
          onClick: () => setActiveView('profile')
        },
        ...(isAdmin()
          ? [
              {
                key: 'admin',
                icon: <Icon icon={Shield} variant="detail" />,
                label: 'Admin Console',
                onClick: () => setActiveView('admin')
              }
            ]
          : []),
        {
          key: 'logout',
          icon: <Icon icon={LogOut} variant="detail" />,
          label: 'Sign out',
          onClick: () => void logout()
        }
      ]
    : [
        {
          key: 'login',
          icon: <Icon icon={LogIn} variant="detail" />,
          label: 'Sign in',
          onClick: () => requireLogin()
        }
      ]

  const notificationItems: MenuProps['items'] =
    notifications.length === 0
      ? [{ key: 'empty', label: 'No new notifications', disabled: true }]
      : [
          ...notifications.slice(0, 8).map((n) => ({
            key: n.id,
            label: (
              <div>
                <div style={{ fontWeight: 600 }}>{n.title}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{n.body}</div>
              </div>
            )
          })),
          { type: 'divider' as const },
          {
            key: 'mark-read',
            label: 'Mark all read',
            onClick: () => void markNotificationsRead()
          }
        ]

  const initials = me?.name
    ? me.name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('')
    : 'ML'

  return (
    <>
      <header className="app-top-bar titlebar-drag-region">
        <div className="app-top-bar-leading titlebar-no-drag" aria-hidden />

        <button type="button" className="app-top-bar-search titlebar-no-drag" onClick={openSearch}>
          <Icon icon={Search} variant="action" />
          <span className="app-top-bar-search-text">Search clusters, resources, namespaces…</span>
          <kbd className="app-top-bar-kbd">{isMac ? '⌘' : 'Ctrl'}K</kbd>
        </button>

        <div className="app-top-bar-actions titlebar-no-drag">
          <ThemeToggle compact />
          <Dropdown menu={{ items: notificationItems }} placement="bottomRight" trigger={['click']}>
            <Tooltip title="Notifications">
              <button type="button" className="ml-icon-btn" aria-label="Notifications">
                <Badge count={me?.unreadNotifications ?? 0} size="small" offset={[2, -2]}>
                  <Icon icon={Bell} variant="toolbar" />
                </Badge>
              </button>
            </Tooltip>
          </Dropdown>
          <Tooltip title="Settings">
            <button
              type="button"
              className="ml-icon-btn"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Icon icon={Settings} variant="toolbar" />
            </button>
          </Tooltip>
          <Dropdown menu={{ items: accountItems }} placement="bottomRight" trigger={['click']}>
            <button
              type="button"
              className="app-top-bar-avatar"
              title={me ? me.email : isDark ? 'Account' : 'Account'}
            >
              {initials}
            </button>
          </Dropdown>
        </div>
      </header>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
