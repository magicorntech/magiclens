import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { Button, Space, Typography } from 'antd'
import { loadTokens, saveTokens } from './api'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { InvitationsPage } from './pages/InvitationsPage'
import { TeamsPage } from './pages/TeamsPage'
import { KubeconfigsPage } from './pages/KubeconfigsPage'
import { PermissionsPage } from './pages/PermissionsPage'
import { AuditPage } from './pages/AuditPage'
import { AcceptInvitationPage } from './pages/AcceptInvitationPage'

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="ml-shell">
      <aside className="ml-sidebar">
        <div className="ml-brand">
          MagicLens
          <span>Admin Console</span>
        </div>
        <nav className="ml-nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/users">Users</NavLink>
          <NavLink to="/invitations">Invitations</NavLink>
          <NavLink to="/teams">Teams</NavLink>
          <NavLink to="/kubeconfigs">Kubeconfigs</NavLink>
          <NavLink to="/permissions">Permissions</NavLink>
          <NavLink to="/audit">Audit Logs</NavLink>
        </nav>
        <Space style={{ marginTop: 'auto' }}>
          <Button
            size="small"
            onClick={() => {
              saveTokens(null)
              navigate('/login')
            }}
          >
            Sign out
          </Button>
        </Space>
      </aside>
      <main className="ml-main">
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Organization administration
        </Typography.Title>
        {children}
      </main>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!loadTokens()) return <Navigate to="/login" replace />
  return <Shell>{children}</Shell>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invitations/accept" element={<AcceptInvitationPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <RequireAuth>
            <UsersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/invitations"
        element={
          <RequireAuth>
            <InvitationsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/teams"
        element={
          <RequireAuth>
            <TeamsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/kubeconfigs"
        element={
          <RequireAuth>
            <KubeconfigsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/permissions"
        element={
          <RequireAuth>
            <PermissionsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/audit"
        element={
          <RequireAuth>
            <AuditPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
