import { useEffect } from 'react'
import { Alert, Button, Form, Input, Modal, Typography } from 'antd'
import { useVpnStore } from '../../stores/vpnStore'
import { useVpnSessionStore } from '../../stores/vpnSessionStore'
import { connectVpnWithSession } from '../../clusterVpn'

/** Global PIN/MFA prompt when bringing up a VPN tunnel for a cluster. */
export function VpnSessionPromptModal(): React.JSX.Element {
  const authPrompt = useVpnSessionStore((s) => s.authPrompt)
  const profiles = useVpnStore((s) => s.profiles)
  const [form] = Form.useForm()

  const profile = authPrompt ? profiles.find((p) => p.id === authPrompt.profileId) : undefined
  const savedPin = authPrompt ? useVpnSessionStore.getState().getPin(authPrompt.profileId) : null
  const open = !!authPrompt && !!profile
  const pinKnown = !!savedPin

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({ pin: savedPin ?? '', mfaCode: '' })
  }, [open, authPrompt?.profileId, savedPin])

  return (
    <Modal
      title={
        authPrompt?.clusterName
          ? `VPN for ${authPrompt.clusterName}`
          : `Connect VPN · ${profile?.name ?? ''}`
      }
      open={open}
      onCancel={() => useVpnSessionStore.getState().clearAuthPrompt()}
      footer={null}
      destroyOnClose
      width={420}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="VPN session"
        description={
          pinKnown
            ? 'PIN is remembered for ~5 hours. Enter a fresh MFA code to bring this tunnel up. Once connected, switching clusters will not ask again while the tunnel stays up.'
            : 'Authenticate once per VPN. Magiclens keeps both tunnels up (like Pritunl), so cluster switching needs no re-login for ~5 hours.'
        }
      />
      {profile && (
        <div style={{ marginBottom: 16, lineHeight: 1.7 }}>
          <div>
            <Typography.Text type="secondary">Profile: </Typography.Text>
            <Typography.Text strong>{profile.name}</Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">User: </Typography.Text>
            <Typography.Text strong>{profile.username || '—'}</Typography.Text>
          </div>
        </div>
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={async (values) => {
          if (!authPrompt) return
          await connectVpnWithSession(
            authPrompt.profileId,
            {
              pin: values.pin || savedPin || '',
              mfaCode: values.mfaCode
            },
            {
              clusterId: authPrompt.clusterId,
              clusterName: authPrompt.clusterName
            }
          )
        }}
      >
        {!pinKnown && (
          <Form.Item name="pin" label="PIN" rules={[{ required: true }]}>
            <Input.Password autoFocus placeholder="VPN PIN" />
          </Form.Item>
        )}
        <Form.Item name="mfaCode" label="MFA / OTP" rules={[{ required: true }]}>
          <Input
            autoFocus={pinKnown}
            placeholder="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Connect & continue
        </Button>
      </Form>
    </Modal>
  )
}
