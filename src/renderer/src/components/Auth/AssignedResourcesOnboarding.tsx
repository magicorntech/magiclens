import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Modal, Space, Typography, message } from 'antd'
import type { MeResponse } from '../../enterprise/api'
import type { VpnProfileSummary } from '@shared/types/vpn'
import { useClusterStore } from '../../stores/clusterStore'
import { useVpnStore } from '../../stores/vpnStore'
import { syncOrgAssignments } from '../../enterprise/sync'

interface AssignedResourcesOnboardingProps {
  me: MeResponse
  open: boolean
  onClose: () => void
}

export function AssignedResourcesOnboarding({
  me,
  open,
  onClose
}: AssignedResourcesOnboardingProps): React.JSX.Element | null {
  const clusters = useClusterStore((s) => s.clusters)
  const vpnProfiles = useVpnStore((s) => s.profiles)
  const [selectedKube, setSelectedKube] = useState<string[]>([])
  const [selectedVpn, setSelectedVpn] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const assignedKube = me.kubeconfigs ?? []
  const assignedVpn = me.vpnProfiles ?? []

  const pendingKube = useMemo(() => {
    const imported = new Set(
      clusters.filter((c) => c.origin === 'org' && c.orgKubeconfigId).map((c) => c.orgKubeconfigId!)
    )
    return assignedKube.filter((k) => k.hasConfig !== false && !imported.has(k.id))
  }, [assignedKube, clusters])

  const pendingVpn = useMemo(() => {
    const imported = new Set(
      vpnProfiles.filter((p) => p.origin === 'org' && p.remoteId).map((p) => p.remoteId!)
    )
    return assignedVpn.filter((p) => !imported.has(p.id))
  }, [assignedVpn, vpnProfiles])

  useEffect(() => {
    if (!open) return
    setSelectedKube(pendingKube.map((k) => k.id))
    setSelectedVpn(pendingVpn.map((p) => p.id))
  }, [open, pendingKube, pendingVpn])

  if (!assignedKube.length && !assignedVpn.length) return null

  async function importSelected(): Promise<void> {
    setBusy(true)
    try {
      const synced = await syncOrgAssignments()
      message.success(
        `Synced ${synced.kubeconfigs} cluster context(s) and ${synced.vpn} VPN profile(s)`
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const hasPending = pendingKube.length > 0 || pendingVpn.length > 0

  return (
    <Modal
      title="Resources assigned to you"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary">
        Your organization shared kubeconfigs (via teams) and VPN profiles with your account.
        They sync automatically on login — you can also import them now. You can still add your
        own clusters and VPN profiles manually anytime.
      </Typography.Paragraph>

      {!hasPending ? (
        <Typography.Text>All assigned resources are already on this device.</Typography.Text>
      ) : (
        <>
          {pendingKube.length > 0 && (
            <>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                Kubeconfigs
              </Typography.Title>
              <Checkbox.Group
                style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}
                value={selectedKube}
                onChange={(vals) => setSelectedKube(vals as string[])}
              >
                {pendingKube.map((k) => (
                  <Checkbox key={k.id} value={k.id}>
                    <Space direction="vertical" size={0}>
                      <Typography.Text strong>{k.name}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {[k.visibility, k.serverEndpoint, k.environment].filter(Boolean).join(' · ')}
                      </Typography.Text>
                    </Space>
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </>
          )}

          {pendingVpn.length > 0 && (
            <>
              <Typography.Title level={5}>VPN profiles</Typography.Title>
              <Checkbox.Group
                style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}
                value={selectedVpn}
                onChange={(vals) => setSelectedVpn(vals as string[])}
              >
                {pendingVpn.map((p) => (
                  <Checkbox key={p.id} value={p.id}>
                    <Space direction="vertical" size={0}>
                      <Typography.Text strong>{p.name}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {[p.provider, p.serverHost, p.protocol].filter(Boolean).join(' · ') || 'VPN profile'}
                      </Typography.Text>
                    </Space>
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </>
          )}
        </>
      )}

      <Space style={{ width: '100%' }} direction="vertical">
        <Button type="primary" block loading={busy} onClick={() => void importSelected()}>
          Sync selected to this device
        </Button>
        <Button block onClick={onClose}>
          Not now
        </Button>
      </Space>
    </Modal>
  )
}

export function shouldShowResourcesOnboarding(
  me: MeResponse | null,
  clusters: ReturnType<typeof useClusterStore.getState>['clusters'],
  vpnProfiles: VpnProfileSummary[]
): boolean {
  if (!me || me.mustChangePassword) return false

  const importedKube = new Set(
    clusters.filter((c) => c.origin === 'org' && c.orgKubeconfigId).map((c) => c.orgKubeconfigId!)
  )
  const kubePending = (me.kubeconfigs ?? []).some(
    (k) => k.hasConfig !== false && !importedKube.has(k.id)
  )

  const importedVpn = new Set(
    vpnProfiles.filter((p) => p.origin === 'org' && p.remoteId).map((p) => p.remoteId!)
  )
  const vpnPending = (me.vpnProfiles ?? []).some((p) => !importedVpn.has(p.id))

  return kubePending || vpnPending
}

/** @deprecated use AssignedResourcesOnboarding */
export const AssignedVpnOnboarding = AssignedResourcesOnboarding
export const shouldShowVpnOnboarding = shouldShowResourcesOnboarding
