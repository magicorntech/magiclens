import { useMemo, useState } from 'react'
import { Button, Modal, Typography } from 'antd'
import type { MollyToolResult } from '@shared/types/molly'
import { RESOURCE_KINDS, apiKindToResourceKind, isNamespaceScoped, type ResourceKind } from '@shared/resourceKinds'
import type { WorkloadActionId, WorkloadKind } from '@shared/types/workload'
import { actionRequiresPermission } from '@shared/workloadActions'
import { useResourcePermissions } from '../../queries/useMetricsRange'
import { useClusterStore } from '../../stores/clusterStore'
import { useBottomPanelOptional, type YamlTabState } from '../Layout/BottomPanelContext'
import { YamlEditorPanelBody } from '../ResourceTable/YamlEditorPanelBody'
import { useWorkloadActions, workloadKindOrNull } from '../Workload/useWorkloadActions'
import { WorkloadActionModals } from '../Workload/WorkloadActionModals'

type ProposalAction = 'scale' | 'restart' | 'apply'

interface WorkloadProposal {
  action: ProposalAction
  clusterId: string
  kind: string
  namespace: string
  name: string
  replicas?: number
  yaml?: string
}

function proposalResourceKind(kind: string): ResourceKind | null {
  const direct = apiKindToResourceKind(kind)
  if (direct) return direct
  const folded = RESOURCE_KINDS.find((item) => item.toLowerCase() === kind.toLowerCase())
  if (folded) return folded
  const titled = kind.charAt(0).toUpperCase() + kind.slice(1)
  return apiKindToResourceKind(titled)
}

function readProposal(tool: MollyToolResult): WorkloadProposal | null {
  if (tool.name !== 'proposeWorkloadAction' || !tool.ok || !tool.data || typeof tool.data !== 'object') return null
  const data = tool.data as Record<string, unknown>
  const action = data.action
  if (action !== 'scale' && action !== 'restart' && action !== 'apply') return null
  const clusterId = typeof data.clusterId === 'string' ? data.clusterId.trim() : ''
  const kind = typeof data.kind === 'string' ? data.kind.trim() : ''
  const namespace = typeof data.namespace === 'string' ? data.namespace.trim() : ''
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!clusterId || !kind || !name) return null
  const proposal: WorkloadProposal = { action, clusterId, kind, namespace, name }
  if (action === 'scale') {
    const replicas = typeof data.replicas === 'number' ? data.replicas : Number.NaN
    if (!Number.isInteger(replicas) || replicas < 0) return null
    proposal.replicas = replicas
  }
  if (action === 'apply') {
    const yaml = typeof data.yaml === 'string' ? data.yaml : ''
    if (!yaml.trim()) return null
    proposal.yaml = yaml
  }
  return proposal
}

function ProposalApplyControl({
  allowed,
  denied,
  summary,
  yaml,
  tab
}: {
  allowed: boolean
  denied: string
  summary: string
  yaml: string
  tab: Omit<YamlTabState, 'id' | 'kind' | 'initialYaml'>
}): React.JSX.Element {
  const openYamlEditor = useBottomPanelOptional()?.openYamlEditor
  const [fallback, setFallback] = useState<YamlTabState | null>(null)

  function openProposedYaml(): void {
    if (!allowed || !yaml.trim()) return
    if (openYamlEditor) {
      openYamlEditor({ ...tab, initialYaml: yaml })
      return
    }
    setFallback({
      id: `yaml-proposal-${Date.now()}`,
      kind: 'yaml',
      ...tab,
      initialYaml: yaml
    })
  }

  if (!allowed) {
    return (
      <Typography.Text type="danger" style={{ fontSize: 12 }}>
        {denied}
      </Typography.Text>
    )
  }

  return (
    <>
      <Button size="small" disabled={!yaml.trim()} onClick={openProposedYaml}>
        {summary}
      </Button>
      <Modal
        open={fallback != null}
        title={fallback?.title}
        footer={null}
        width={880}
        destroyOnHidden
        onCancel={() => setFallback(null)}
      >
        {fallback ? (
          <div className="ml-proposal-yaml-modal">
            <YamlEditorPanelBody tab={fallback} onDone={() => setFallback(null)} />
          </div>
        ) : null}
      </Modal>
    </>
  )
}

function MollyWorkloadKindProposal({
  proposal,
  summary,
  resourceKind,
  workloadKind
}: {
  proposal: WorkloadProposal
  summary: string
  resourceKind: ResourceKind
  workloadKind: WorkloadKind
}): React.JSX.Element {
  const isConnected = useClusterStore(
    (s) => s.clusters.find((c) => c.id === proposal.clusterId)?.status === 'connected'
  )
  const selectedNamespace = useClusterStore(
    (s) => s.clusters.find((c) => c.id === proposal.clusterId)?.selectedNamespace
  )
  const listNamespace = selectedNamespace !== undefined ? selectedNamespace : proposal.namespace
  const listQueryKey = useMemo(
    () => [
      'resource-list',
      proposal.clusterId,
      isNamespaceScoped(resourceKind) ? listNamespace : 'ALL',
      resourceKind
    ],
    [proposal.clusterId, listNamespace, resourceKind]
  )
  const target = useMemo(() => ({ type: 'builtin' as const, kind: resourceKind }), [resourceKind])
  const workload = useWorkloadActions({
    clusterId: proposal.clusterId,
    kind: workloadKind,
    namespace: proposal.namespace,
    name: proposal.name,
    target,
    listQueryKey,
    enabled: isConnected
  })

  const actionId: WorkloadActionId = proposal.action === 'apply' ? 'editYaml' : proposal.action
  const permKey = actionRequiresPermission(actionId)
  const allowed = permKey ? workload.isActionAllowed(actionId) : true

  function openProposedAction(): void {
    if (!allowed) return
    void workload.handleAction(proposal.action)
  }

  if (proposal.action === 'apply') {
    return (
      <ProposalApplyControl
        allowed={allowed}
        denied={workload.actionDeniedReason(actionId)}
        summary={summary}
        yaml={proposal.yaml ?? ''}
        tab={{
          title: `Edit: ${proposal.name}`,
          clusterId: proposal.clusterId,
          mode: 'edit',
          target,
          namespace: proposal.namespace,
          name: proposal.name,
          listQueryKey
        }}
      />
    )
  }

  if (!allowed) {
    return (
      <Typography.Text type="danger" style={{ fontSize: 12 }}>
        {workload.actionDeniedReason(actionId)}
      </Typography.Text>
    )
  }

  return (
    <>
      <Button size="small" onClick={openProposedAction}>
        {summary}
      </Button>
      {proposal.action === 'scale' || proposal.action === 'restart' ? (
        <WorkloadActionModals
          clusterId={proposal.clusterId}
          kind={workloadKind}
          namespace={proposal.namespace}
          name={proposal.name}
          workload={workload}
          initialReplicas={proposal.action === 'scale' ? proposal.replicas : undefined}
        />
      ) : null}
    </>
  )
}

function MollyApplyResourceProposal({
  proposal,
  summary,
  resourceKind
}: {
  proposal: WorkloadProposal
  summary: string
  resourceKind: ResourceKind
}): React.JSX.Element {
  const isConnected = useClusterStore(
    (s) => s.clusters.find((c) => c.id === proposal.clusterId)?.status === 'connected'
  )
  const selectedNamespace = useClusterStore(
    (s) => s.clusters.find((c) => c.id === proposal.clusterId)?.selectedNamespace
  )
  const listNamespace = selectedNamespace !== undefined ? selectedNamespace : proposal.namespace
  const listQueryKey = useMemo(
    () => [
      'resource-list',
      proposal.clusterId,
      isNamespaceScoped(resourceKind) ? listNamespace : 'ALL',
      resourceKind
    ],
    [proposal.clusterId, listNamespace, resourceKind]
  )
  const target = useMemo(() => ({ type: 'builtin' as const, kind: resourceKind }), [resourceKind])
  const { data: permissions, isFetching, isError } = useResourcePermissions(
    proposal.clusterId,
    target,
    proposal.namespace,
    proposal.name,
    isConnected
  )
  const permKey = actionRequiresPermission('editYaml')
  const allowed = !isConnected
    ? false
    : !permKey
      ? true
      : isError
        ? true
        : permissions && !permissions.verified
          ? true
          : isFetching && !permissions
            ? true
            : (permissions?.[permKey] ?? true)

  return (
    <ProposalApplyControl
      allowed={allowed}
      denied={
        isConnected
          ? 'Missing RBAC permission to update this resource'
          : 'Cluster is disconnected. Connect to run actions.'
      }
      summary={summary}
      yaml={proposal.yaml ?? ''}
      tab={{
        title: `Edit: ${proposal.name}`,
        clusterId: proposal.clusterId,
        mode: 'edit',
        target,
        namespace: proposal.namespace,
        name: proposal.name,
        listQueryKey
      }}
    />
  )
}

/** Renders the confirm control for a `proposeWorkloadAction` tool result. */
export function MollyWorkloadProposal({ tool }: { tool: MollyToolResult }): React.JSX.Element | null {
  const proposal = readProposal(tool)
  if (!proposal) return null
  const resourceKind = proposalResourceKind(proposal.kind)
  const workloadKind = resourceKind ? workloadKindOrNull(resourceKind) : null
  if (!resourceKind || !workloadKind) {
    if (proposal.action === 'apply' && resourceKind) {
      return <MollyApplyResourceProposal proposal={proposal} summary={tool.summary} resourceKind={resourceKind} />
    }
    return null
  }
  return (
    <MollyWorkloadKindProposal
      proposal={proposal}
      summary={tool.summary}
      resourceKind={resourceKind}
      workloadKind={workloadKind}
    />
  )
}
