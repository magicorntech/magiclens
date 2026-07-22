import { useState } from 'react'
import { Alert, Button, Form, Input, Typography, message } from 'antd'
import logo from '../../assets/logo.png'
import { useAuthStore } from '../../stores/authStore'
import { useClusterStore } from '../../stores/clusterStore'
import { resolveUserScope, switchWorkspace, reconnectOpenedTabs } from '../../workspace'
import { syncOrgAssignments } from '../../enterprise/sync'

interface LoginScreenProps {
  onAuthenticated: () => void
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps): React.JSX.Element {
  const login = useAuthStore((s) => s.login)
  const continueOffline = useAuthStore((s) => s.continueOffline)
  const apiBase = useAuthStore((s) => s.apiBase)
  const setApiBaseUrl = useAuthStore((s) => s.setApiBaseUrl)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const setActiveView = useClusterStore((s) => s.setActiveView)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <div className="ml-login-screen">
      <div className="ml-login-card">
        <img src={logo} alt="" className="ml-login-logo" />
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          Sign in to MagicLens
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Use your organization email and password. Admins open Admin Console; members open their
          profile. You can also continue offline with local kubeconfigs only.
        </Typography.Paragraph>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <Form
          layout="vertical"
          initialValues={{ email: 'owner@magiclens.local', password: 'MagicLens123!', apiBase }}
          onFinish={async (values) => {
            setBusy(true)
            try {
              if (values.apiBase) setApiBaseUrl(values.apiBase)
              await login(values.email, values.password)
              const auth = useAuthStore.getState()
              await switchWorkspace(resolveUserScope(auth.me, false), { reconnect: false })
              try {
                const synced = await syncOrgAssignments()
                if (synced.kubeconfigs > 0 || synced.vpn > 0) {
                  message.success(
                    `Synced ${synced.kubeconfigs} cluster context(s) and ${synced.vpn} VPN profile(s)`
                  )
                }
              } catch (err) {
                message.warning(
                  `Signed in, but sync failed: ${err instanceof Error ? err.message : String(err)}`
                )
              }
              if (auth.mustChangePassword) setActiveView('profile')
              else setActiveView(auth.isAdmin() ? 'admin' : 'profile')
              onAuthenticated()
              // Reconnect in background — private clusters time out without VPN and must not block UI.
              void reconnectOpenedTabs()
            } catch {
              // login() already set error
            } finally {
              setBusy(false)
            }
          }}
        >
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input autoFocus placeholder="you@company.com" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password placeholder="Password" />
          </Form.Item>

          {showAdvanced && (
            <Form.Item name="apiBase" label="API base URL">
              <Input placeholder="http://localhost:3000" />
            </Form.Item>
          )}

          <Button type="primary" htmlType="submit" block loading={busy || loading} size="large">
            Sign in
          </Button>
        </Form>

        <div className="ml-login-actions">
          <Button type="link" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? 'Hide API settings' : 'API settings'}
          </Button>
          <Button
            type="link"
            onClick={() => {
              continueOffline()
              void switchWorkspace('offline')
              setActiveView('clusters')
              onAuthenticated()
            }}
          >
            Continue offline
          </Button>
        </div>
      </div>
    </div>
  )
}
