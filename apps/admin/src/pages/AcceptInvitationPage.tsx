import { useState } from 'react'
import { Alert, Button, Form, Input, message } from 'antd'
import { useSearchParams } from 'react-router-dom'
import { api, login } from '../api'

export function AcceptInvitationPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="ml-login">
      <div className="ml-login-card">
        <h1>Accept invitation</h1>
        <p>Sign in with the invited email to join the organization.</p>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Form
          layout="vertical"
          initialValues={{ token, email: '' }}
          onFinish={async (values) => {
            setError(null)
            try {
              await login(values.email)
              await api('/invitations/accept', {
                method: 'POST',
                body: JSON.stringify({ token: values.token })
              })
              message.success('Invitation accepted')
              window.location.href = '/'
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err))
            }
          }}
        >
          <Form.Item name="email" label="Invited email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="token" label="Invitation token" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Accept
          </Button>
        </Form>
      </div>
    </div>
  )
}
