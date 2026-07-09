import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, InputNumber, Space, Tag, Tooltip, message } from 'antd'
import { Link, PlayCircle, Square } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { usePortForwards } from '../../queries/usePortForwards'

type ForwardTarget =
  | { mode: 'pod'; podName: string; targetPort: number }
  | { mode: 'service'; serviceName: string; port: number }

interface PortForwardControlProps {
  clusterId: string
  namespace: string
  label: string
  target: ForwardTarget
}

export function PortForwardControl({ clusterId, namespace, label, target }: PortForwardControlProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const { data } = usePortForwards(clusterId)

  const sourcePort = target.mode === 'pod' ? target.targetPort : target.port
  const sourceName = target.mode === 'pod' ? target.podName : target.serviceName

  const activeSession = useMemo(
    () =>
      data?.sessions.find(
        (s) =>
          s.namespace === namespace &&
          s.sourceKind === target.mode &&
          s.sourceName === sourceName &&
          s.sourcePort === sourcePort
      ) ?? null,
    [data, namespace, target.mode, sourceName, sourcePort]
  )

  const [localPort, setLocalPort] = useState<number>(sourcePort)
  const [busy, setBusy] = useState(false)

  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['port-forwards', clusterId] })
  }

  async function handleStart(): Promise<void> {
    setBusy(true)
    try {
      const res =
        target.mode === 'pod'
          ? await window.api.portForward.startPod({
              clusterId,
              namespace,
              podName: target.podName,
              targetPort: target.targetPort,
              localPort: localPort || undefined,
              label
            })
          : await window.api.portForward.startService({
              clusterId,
              namespace,
              serviceName: target.serviceName,
              port: target.port,
              localPort: localPort || undefined,
              label
            })
      if (res.ok) {
        message.success(`Forwarding localhost:${res.session.localPort} → ${label}`)
        window.open(`http://localhost:${res.session.localPort}`, '_blank')
        await refresh()
      } else {
        message.error(res.error)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleStop(): Promise<void> {
    if (!activeSession) return
    setBusy(true)
    try {
      await window.api.portForward.stop({ id: activeSession.id })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  if (activeSession) {
    return (
      <Space size="small">
        <Tag color="green">localhost:{activeSession.localPort}</Tag>
        <Tooltip title={`Open http://localhost:${activeSession.localPort}`}>
          <Button
            size="small"
            type="text"
            icon={<Icon icon={Link} variant="detail" />}
            onClick={() => window.open(`http://localhost:${activeSession.localPort}`, '_blank')}
          />
        </Tooltip>
        <Button size="small" danger icon={<Icon icon={Square} variant="detail" />} loading={busy} onClick={handleStop}>
          Stop
        </Button>
      </Space>
    )
  }

  return (
    <Space size="small">
      <InputNumber
        size="small"
        min={1}
        max={65535}
        value={localPort}
        onChange={(v) => setLocalPort(v ?? sourcePort)}
        style={{ width: 90 }}
        placeholder="Local port"
      />
      <Button size="small" type="primary" icon={<Icon icon={PlayCircle} variant="detail" />} loading={busy} onClick={handleStart}>
        Forward
      </Button>
    </Space>
  )
}
