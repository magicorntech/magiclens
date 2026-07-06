import { Button, Typography } from 'antd'
import { ArrowRightOutlined } from '@ant-design/icons'
import logo from '../../assets/logo.png'

interface SplashIntroScreenProps {
  onStart: () => void
}

/**
 * One-off animated intro screen: shown on the very first launch ever, and again the first time
 * the app is opened after an update (see WelcomeStateResponse.showSplash). Every other launch
 * just uses the plain LoadingScreen spinner instead - by the time this renders, app state has
 * already finished hydrating, so the "Get Started" button is always immediately clickable.
 */
export function SplashIntroScreen({ onStart }: SplashIntroScreenProps): React.JSX.Element {
  return (
    <div
      style={{
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0610',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="splash-blob splash-blob-1" />
      <div className="splash-blob splash-blob-2" />
      <div className="splash-blob splash-blob-3" />
      <div className="splash-blob splash-blob-4" />
      <div className="splash-blob splash-blob-5" />
      <div className="splash-noise" />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28
        }}
        className="splash-content"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <img
            src={logo}
            alt="MagicLens"
            style={{
              width: 88,
              height: 88,
              borderRadius: 20,
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)'
            }}
          />
          <Typography.Text
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 0.5,
              textShadow: '0 2px 24px rgba(0,0,0,0.4)'
            }}
          >
            MagicLens
          </Typography.Text>
          <Typography.Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            A fast, focused desktop client for Kubernetes
          </Typography.Text>
        </div>

        <div style={{ height: 44, display: 'flex', alignItems: 'center' }}>
          <Button
            type="primary"
            size="large"
            shape="round"
            icon={<ArrowRightOutlined />}
            iconPosition="end"
            onClick={onStart}
            style={{ paddingLeft: 28, paddingRight: 24, fontWeight: 600 }}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  )
}
