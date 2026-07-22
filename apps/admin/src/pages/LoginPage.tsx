import { useState } from 'react'
import { Alert, Button, Form, Input, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'

export function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="ml-login">
      <div className="ml-login-card">
        <h1>MagicLens Admin</h1>
        <p>Sign in with your organization email. Local Docker uses the seed owner account.</p>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Form
          layout="vertical"
          initialValues={{ email: 'owner@magiclens.local', name: 'Owner Admin' }}
          onFinish={async (values) => {
            setLoading(true)
            setError(null)
            try {
              await login(values.email, values.name)
              message.success('Signed in')
              navigate('/')
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err))
            } finally {
              setLoading(false)
            }
          }}
        >
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Display name">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Continue
          </Button>
        </Form>
      </div>
    </div>
  )
}
