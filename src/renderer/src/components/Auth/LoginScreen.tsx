import { useState } from 'react'
import { Alert, Button, Form, Input, Typography, message } from 'antd'
import { useTranslation } from 'react-i18next'
import logo from '../../assets/logo.png'
import { useAuthStore } from '../../stores/authStore'
import { useClusterStore } from '../../stores/clusterStore'
import { resolveUserScope, switchWorkspace, reconnectOpenedTabs } from '../../workspace'
import { syncOrgAssignments } from '../../enterprise/sync'

interface LoginScreenProps {
  onAuthenticated: () => void
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps): React.JSX.Element {
  const { t } = useTranslation()
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
          {t('auth.signInTitle')}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          {t('auth.signInBody')}
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
                    t('auth.syncedToast', { kubeconfigs: synced.kubeconfigs, vpn: synced.vpn })
                  )
                }
              } catch (err) {
                message.warning(
                  t('auth.syncFailedToast', {
                    error: err instanceof Error ? err.message : String(err)
                  })
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
          <Form.Item name="email" label={t('auth.email')} rules={[{ required: true, type: 'email' }]}>
            <Input autoFocus placeholder={t('auth.emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="password" label={t('auth.password')} rules={[{ required: true, min: 8 }]}>
            <Input.Password placeholder={t('auth.passwordPlaceholder')} />
          </Form.Item>

          {showAdvanced && (
            <Form.Item name="apiBase" label={t('auth.apiBase')}>
              <Input placeholder={t('auth.apiBasePlaceholder')} />
            </Form.Item>
          )}

          <Button type="primary" htmlType="submit" block loading={busy || loading} size="large">
            {t('auth.signIn')}
          </Button>
        </Form>

        <div className="ml-login-actions">
          <Button type="link" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? t('auth.hideApiSettings') : t('auth.apiSettings')}
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
            {t('auth.continueOffline')}
          </Button>
        </div>
      </div>
    </div>
  )
}
