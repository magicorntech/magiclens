import { Spin, Typography, theme } from 'antd'
import logo from '../../assets/logo.png'

export function LoadingScreen(): React.JSX.Element {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: token.colorBgLayout
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={logo} alt="MagicLens" style={{ width: 36, height: 36, borderRadius: 8 }} />
        <Typography.Text style={{ fontSize: 22, fontWeight: 600 }}>MagicLens</Typography.Text>
      </div>
      <Spin size="large" />
    </div>
  )
}
