import { useCallback, useMemo, useState } from 'react'
import { Modal, message } from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import type { WorkloadActionId, WorkloadKind } from '@shared/types/workload'
import { isWorkloadKind } from '@shared/types/workload'
import { WORKLOAD_ACTIONS_BY_KIND, actionRequiresPermission } from '@shared/workloadActions'
import { useClusterStore } from '../../stores/clusterStore'
import { recordWorkloadAudit } from '../../stores/workloadAuditStore'

export type WorkloadModal =
  | 'scale'
  | 'restart'
  | 'changeImage'
  | 'rolloutHistory'
  | 'rollback'
  | null

interface UseWorkloadActionsOptions {
  clusterId: string
  kind: WorkloadKind
  namespace: string
  name: string
  target: ResourceMutationTarget
  listQueryKey: unknown[]
  enabled?: boolean
}

export function useWorkloadActions({
  clusterId,
  kind,
  namespace,
  name,
  target,
  listQueryKey,
  enabled = true
}: UseWorkloadActionsOptions) {
  const queryClient = useQueryClient()
  const openResourceKind = useClusterStore((s) => s.openResourceKind)
  const navigateToResource = useClusterStore((s) => s.navigateToResource)

  const clusterStatus = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId)?.status)
  const isConnected = clusterStatus === 'connected'

  const [modal, setModal] = useState<WorkloadModal>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { data: permissions, isFetching: permissionsLoading, isError: permissionsError } = useQuery({
    queryKey: ['workload-permissions', clusterId, clusterStatus, target, namespace, name],
    queryFn: () => window.api.workload.getPermissions({ clusterId, target, namespace, name }),
    enabled: enabled && isConnected,
    staleTime: 30_000,
    retry: 1
  })

  const { data: context } = useQuery({
    queryKey: ['workload-context', clusterId, kind, namespace, name],
    queryFn: async () => {
      const res = await window.api.workload.getContext({ clusterId, kind, namespace, name })
      if ('error' in res) throw new Error(res.error)
      return res
    },
    enabled: enabled && isConnected,
    staleTime: 30_000
  })

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: listQueryKey })
    await queryClient.invalidateQueries({ queryKey: ['workload-context', clusterId, kind, namespace, name] })
  }, [queryClient, listQueryKey, clusterId, kind, namespace, name])

  const runAction = useCallback(
    async (actionId: WorkloadActionId, fn: () => Promise<{ ok: true; kubectlCommand: string } | { error: string }>) => {
      setActionLoading(true)
      try {
        const res = await fn()
        if ('error' in res) {
          recordWorkloadAudit({ clusterId, kind, namespace, name, action: actionId, success: false, error: res.error })
          message.error(res.error)
          return false
        }
        recordWorkloadAudit({
          clusterId,
          kind,
          namespace,
          name,
          action: actionId,
          success: true,
          kubectlCommand: res.kubectlCommand
        })
        message.success('Action completed')
        await invalidate()
        return true
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        recordWorkloadAudit({ clusterId, kind, namespace, name, action: actionId, success: false, error })
        message.error(error)
        return false
      } finally {
        setActionLoading(false)
      }
    },
    [clusterId, kind, namespace, name, invalidate]
  )

  const isActionAllowed = useCallback(
    (actionId: WorkloadActionId): boolean => {
      if (!isConnected) return false
      const permKey = actionRequiresPermission(actionId)
      if (!permKey) return true
      if (permissionsError) return true
      if (permissions && !permissions.verified) return true
      if (permissionsLoading && !permissions) return true
      return permissions?.[permKey] ?? true
    },
    [isConnected, permissions, permissionsLoading, permissionsError]
  )

  const actionDeniedReason = useCallback(
    (actionId: WorkloadActionId): string => {
      if (!isConnected) return 'Cluster is disconnected. Connect to run actions.'
      if (permissionsError) return 'Could not verify permissions. Try reconnecting the cluster.'
      const permKey = actionRequiresPermission(actionId)
      if (!permKey) return "You don't have permission for this action"
      const labels: Record<string, string> = {
        canScale: 'scale workloads (update/patch deployments/scale)',
        canPatch: 'patch or update this resource',
        canUpdate: 'update this resource',
        canDelete: 'delete this resource',
        canDeletePods: 'delete pods in this namespace',
        canCreateJobs: 'create Jobs in this namespace'
      }
      return `Missing RBAC permission to ${labels[permKey] ?? permKey}`
    },
    [isConnected, permissionsError]
  )

  const visibleActions = useMemo(() => {
    const defs = WORKLOAD_ACTIONS_BY_KIND[kind]
    return defs.filter((def) => {
      if (def.id === 'pauseRollout' && context?.paused === true) return false
      if (def.id === 'resumeRollout' && context?.paused !== true) return false
      if (def.id === 'suspend' && context?.suspended === true) return false
      if (def.id === 'resume' && context?.suspended !== true) return false
      return true
    })
  }, [kind, context])

  const handleAction = useCallback(
    async (actionId: WorkloadActionId): Promise<void> => {
      const req = { clusterId, kind, namespace, name }

      switch (actionId) {
        case 'scale':
          setModal('scale')
          return
        case 'restart':
          setModal('restart')
          return
        case 'changeImage':
          setModal('changeImage')
          return
        case 'rolloutHistory':
          setModal('rolloutHistory')
          return
        case 'rollback':
          setModal('rollback')
          return
        case 'rolloutStatus':
          setModal('rolloutHistory')
          return
        case 'pauseRollout':
          Modal.confirm({
            title: `Pause rollout for ${name}?`,
            content: `kubectl rollout pause deployment ${name} -n ${namespace}`,
            onOk: () => runAction('pauseRollout', () => window.api.workload.pauseRollout(req))
          })
          return
        case 'resumeRollout':
          Modal.confirm({
            title: `Resume rollout for ${name}?`,
            onOk: () => runAction('resumeRollout', () => window.api.workload.resumeRollout(req))
          })
          return
        case 'suspend':
          if (kind === 'Jobs') {
            Modal.confirm({
              title: `Suspend job ${name}?`,
              onOk: () => runAction('suspend', () => window.api.workload.suspendJob(req))
            })
          } else if (kind === 'CronJobs') {
            Modal.confirm({
              title: `Suspend CronJob ${name}?`,
              onOk: () => runAction('suspend', () => window.api.workload.suspendCronJob(req))
            })
          }
          return
        case 'resume':
          if (kind === 'Jobs') {
            await runAction('resume', () => window.api.workload.resumeJob(req))
          } else if (kind === 'CronJobs') {
            await runAction('resume', () => window.api.workload.resumeCronJob(req))
          }
          return
        case 'rerun':
          Modal.confirm({
            title: `Rerun job ${name}?`,
            content: 'Creates a new Job from the existing Job spec.',
            onOk: () => runAction('rerun', () => window.api.workload.rerunJob(req))
          })
          return
        case 'triggerManual':
          Modal.confirm({
            title: `Trigger CronJob ${name} manually?`,
            onOk: () => runAction('triggerManual', () => window.api.workload.triggerCronJob(req))
          })
          return
        case 'deletePods':
          Modal.confirm({
            title: `Delete pods for ${name}?`,
            content: 'Pods will be recreated by the workload controller. This is a manual restart fallback.',
            okText: 'Delete pods',
            okButtonProps: { danger: true },
            onOk: () => runAction('deletePods', () => window.api.workload.deletePods(req))
          })
          return
        case 'viewPods':
          openResourceKind(clusterId, 'Pods')
          message.info(`Opened Pods in ${namespace}`)
          return
        case 'viewReplicaSets':
          openResourceKind(clusterId, 'ReplicaSets')
          message.info(`Opened ReplicaSets in ${namespace}`)
          return
        case 'viewJobs':
          openResourceKind(clusterId, 'Jobs')
          message.info(`Opened Jobs in ${namespace}`)
          return
        case 'viewPvcs':
          openResourceKind(clusterId, 'PersistentVolumeClaims')
          message.info(`Opened PVCs in ${namespace}`)
          return
        case 'viewOwnerDeployment':
          if (context?.replicas?.ownerDeploymentName) {
            navigateToResource(clusterId, {
              kind: 'Deployments',
              namespace,
              name: context.replicas.ownerDeploymentName
            })
          } else {
            message.warning('No owner Deployment found')
          }
          return
        case 'viewTargetWorkload': {
          const ref = context?.scaleTargetRef
          if (!ref?.name) {
            message.warning('No scale target found on this HPA')
            return
          }
          const kindMap: Record<string, ResourceKind> = {
            Deployment: 'Deployments',
            StatefulSet: 'StatefulSets',
            ReplicaSet: 'ReplicaSets',
            ReplicationController: 'ReplicationControllers'
          }
          const targetKind = kindMap[ref.kind]
          if (targetKind) {
            navigateToResource(clusterId, { kind: targetKind, namespace, name: ref.name })
          } else {
            message.info(`Target workload: ${ref.kind}/${ref.name}`)
          }
          return
        }
        default:
          return
      }
    },
    [clusterId, kind, namespace, name, context, openResourceKind, navigateToResource, runAction]
  )

  const confirmScale = useCallback(
    async (replicas: number) => {
      const ok = await runAction('scale', () =>
        window.api.workload.scale({ clusterId, kind, namespace, name, replicas })
      )
      if (ok) setModal(null)
    },
    [runAction, clusterId, kind, namespace, name]
  )

  const confirmRestart = useCallback(async () => {
    const ok = await runAction('restart', () => window.api.workload.restart({ clusterId, kind, namespace, name }))
    if (ok) setModal(null)
  }, [runAction, clusterId, kind, namespace, name])

  const confirmChangeImage = useCallback(
    async (containerName: string, image: string) => {
      const ok = await runAction('changeImage', () =>
        window.api.workload.changeImage({ clusterId, kind, namespace, name, containerName, image })
      )
      if (ok) setModal(null)
    },
    [runAction, clusterId, kind, namespace, name]
  )

  const confirmRollback = useCallback(
    async (revision: number) => {
      const ok = await runAction('rollback', () =>
        window.api.workload.rollback({ clusterId, kind, namespace, name, revision })
      )
      if (ok) setModal(null)
    },
    [runAction, clusterId, kind, namespace, name]
  )

  return {
    permissions,
    context,
    modal,
    setModal,
    actionLoading,
    visibleActions,
    isActionAllowed,
    handleAction,
    confirmScale,
    confirmRestart,
    confirmChangeImage,
    confirmRollback,
    invalidate,
    isConnected,
    actionDeniedReason
  }
}

export function workloadKindOrNull(kind: ResourceKind): WorkloadKind | null {
  return isWorkloadKind(kind) ? kind : null
}
