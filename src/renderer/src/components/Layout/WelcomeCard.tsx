import { Button, Modal, Space, Typography } from 'antd'
import { Box, Cable, LayoutDashboard, Layers, Terminal } from 'lucide-react'
import { Icon } from '../ui/Icon'
import logo from '../../assets/logo.png'

interface WelcomeCardProps {
  open: boolean
  onClose: () => void
}

const features: { icon: React.ReactNode; title: string; description: string }[] = [
  {
    icon: <Icon icon={Layers} variant="default" />,
    title: 'Multi-cluster management',
    description: 'Add clusters from kubeconfig files or folders and switch between them instantly.'
  },
  {
    icon: <Icon icon={Box} variant="default" />,
    title: 'Full resource explorer',
    description: 'Browse Workloads, Config, Network, Storage and Cluster resources in one organized sidebar.'
  },
  {
    icon: <Icon icon={LayoutDashboard} variant="default" />,
    title: 'Live metrics',
    description: 'See cluster-wide and per-node CPU/memory usage, plus live pod metrics.'
  },
  {
    icon: <Icon icon={Terminal} variant="default" />,
    title: 'Logs, exec & terminal',
    description: 'Tail and download pod logs, exec into containers, or open local terminal tabs at the bottom.'
  },
  {
    icon: <Icon icon={Cable} variant="default" />,
    title: 'Port forwarding',
    description: 'Forward a Pod or Service to a local port and jump straight into the browser.'
  }
]

export function WelcomeCard({ open, onClose }: WelcomeCardProps): React.JSX.Element {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={560}
      maskClosable={false}
      closable={false}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src={logo} alt="MagicLens" style={{ width: 64, height: 64, borderRadius: 14 }} />
        <Typography.Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>
          Welcome to MagicLens
        </Typography.Title>
        <Typography.Text type="secondary">A fast, focused desktop client for Kubernetes.</Typography.Text>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: 24 }}>
        {features.map((feature) => (
          <div key={feature.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--ml-primary)', marginTop: 2 }}>{feature.icon}</div>
            <div>
              <Typography.Text strong>{feature.title}</Typography.Text>
              <div>
                <Typography.Text type="secondary">{feature.description}</Typography.Text>
              </div>
            </div>
          </div>
        ))}
      </Space>

      <Button type="primary" block size="large" onClick={onClose}>
        Get started
      </Button>
    </Modal>
  )
}
