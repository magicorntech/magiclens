import { useEffect } from 'react'
import { Alert, Button, Form, Input, Modal, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useVpnStore } from '../../stores/vpnStore'
import { useVpnSessionStore } from '../../stores/vpnSessionStore'
import { connectVpnWithSession } from '../../clusterVpn'

/** Global PIN/MFA prompt when bringing up a VPN tunnel for a cluster. */
export function VpnSessionPromptModal(): React.JSX.Element {
  const { t } = useTranslation()
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
          ? t('vpn.session.titleForCluster', { cluster: authPrompt.clusterName })
          : t('vpn.session.titleConnect', { name: profile?.name ?? '' })
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
        message={t('vpn.session.alertTitle')}
        description={pinKnown ? t('vpn.session.pinKnownDesc') : t('vpn.session.pinUnknownDesc')}
      />
      {profile && (
        <div style={{ marginBottom: 16, lineHeight: 1.7 }}>
          <div>
            <Typography.Text type="secondary">{t('vpn.session.profile')} </Typography.Text>
            <Typography.Text strong>{profile.name}</Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">{t('vpn.session.user')} </Typography.Text>
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
          <Form.Item name="pin" label={t('vpn.session.pin')} rules={[{ required: true }]}>
            <Input.Password autoFocus placeholder={t('vpn.session.pinPlaceholder')} />
          </Form.Item>
        )}
        <Form.Item name="mfaCode" label={t('vpn.session.mfa')} rules={[{ required: true }]}>
          <Input
            autoFocus={pinKnown}
            placeholder={t('vpn.session.mfaPlaceholder')}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          {t('vpn.session.connectContinue')}
        </Button>
      </Form>
    </Modal>
  )
}
