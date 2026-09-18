import { useMemo, useState } from 'react'
import { Alert, Dropdown, Modal, Tabs, Tag, message } from 'antd'
import type { MenuProps } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, FileCode2, Pencil, Trash2 } from 'lucide-react'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import { isWorkloadKind, isWorkloadLogKind } from '@shared/types/workload'
import { useTranslation } from 'react-i18next'
import { useResourceManifest } from '../../queries/useResourceManifest'
import { AgeCell } from '../ResourceTable/AgeCell'
import { StatusTag } from '../ResourceTable/StatusTag'
import { ResourceEventsPanel } from '../ResourceTable/ResourceEventsPanel'
import { LoadingState } from '../ResourceTable/EmptyErrorStates'
import { WorkloadDetailToolbar } from '../Workload/WorkloadDetailToolbar'
import { WorkloadLogsPanel } from '../Workload/WorkloadLogsPanel'
import { WorkloadPodsPanel } from '../Workload/WorkloadPodsPanel'
import { ServicePortForwardPanel } from '../Pod/ServicePortForwardPanel'
import { NodeMetricsPanel } from '../Metrics/NodeMetricsPanel'
import { PvcMetricsPanel } from '../Metrics/PvcMetricsPanel'
import { NodePressurePanel } from '../Metrics/NodePressurePanel'
import { WorkloadReplicaHistoryPanel } from '../Metrics/WorkloadReplicaHistoryPanel'
import { NodeExecPanel } from '../Node/NodeExecPanel'
import { NodePodsPanel } from '../Node/NodePodsPanel'
import { ResourceNotesTab } from '../Notes/ResourceNotesTab'
import { kindColumnDefs } from '../../resourceConfig/kinds.renderer'
import { useBottomPanelOptional } from '../Layout/BottomPanelContext'
import { Icon } from '../ui/Icon'
import { parseResourceManifest } from './parseManifest'
import {
  DetailChips,
  DetailConditionList,
  DetailFactGrid,
  DetailKVList,
  DetailOverview,
  DetailPane,
  DetailSection,
  DetailSubblock,
  DetailToolButton,
  DetailToolbar,
  DetailToolbarSpacer,
  DetailMono,
  DetailEmpty
} from './detailPrimitives'

interface GenericResourceDetailViewProps {
  clusterId: string
  kind: ResourceKind
  item: ResourceListItem
  isActive: boolean
  listQueryKey?: unknown[]
  onClose: () => void
}

function kubectlKind(kind: ResourceKind): string {
  // Rough plural→singular mapping for kubectl
  const map: Partial<Record<ResourceKind, string>> = {
    Pods: 'pod',
    Deployments: 'deployment',
    StatefulSets: 'statefulset',
    DaemonSets: 'daemonset',
    ReplicaSets: 'replicaset',
    ReplicationControllers: 'rc',
    Jobs: 'job',
    CronJobs: 'cronjob',
    Services: 'service',
    ConfigMaps: 'configmap',
    Secrets: 'secret',
    Ingresses: 'ingress',
    Nodes: 'node',
    Namespaces: 'namespace',
    PersistentVolumeClaims: 'pvc',
    PersistentVolumes: 'pv',
    HorizontalPodAutoscalers: 'hpa',
    PodDisruptionBudgets: 'pdb',
    ServiceAccounts: 'sa',
    NetworkPolicies: 'networkpolicy',
    ResourceQuotas: 'resourcequota',
    LimitRanges: 'limitrange',
    PriorityClasses: 'priorityclass',
    RuntimeClasses: 'runtimeclass',
    Leases: 'lease',
    StorageClasses: 'storageclass',
    EndpointSlices: 'endpointslice',
    Endpoints: 'endpoints',
    Roles: 'role',
    RoleBindings: 'rolebinding',
    ClusterRoles: 'clusterrole',
    ClusterRoleBindings: 'clusterrolebinding',
    CustomResourceDefinitions: 'crd',
    Events: 'event',
    MutatingWebhookConfigurations: 'mutatingwebhookconfiguration',
    ValidatingWebhookConfigurations: 'validatingwebhookconfiguration',
    IngressClasses: 'ingressclass'
  }
  return map[kind] ?? kind.toLowerCase()
}

export function GenericResourceDetailView({
  clusterId,
  kind,
  item,
  isActive,
  listQueryKey,
  onClose
}: GenericResourceDetailViewProps): React.JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const bottomPanel = useBottomPanelOptional()
  const openYamlEditor = bottomPanel?.openYamlEditor
  const [activeTab, setActiveTab] = useState('overview')
  const target = { type: 'builtin' as const, kind }
  const namespace = item.namespace
  const name = item.name

  const yamlEnabled = isActive && (activeTab === 'yaml' || activeTab === 'overview' || activeTab === 'spec')
  const { data: manifest, isLoading: manifestLoading, error: manifestError } = useResourceManifest(
    clusterId,
    kind,
    name,
    namespace,
    yamlEnabled
  )

  const parsed = useMemo(() => (manifest ? parseResourceManifest(manifest) : null), [manifest])

  async function runDelete(): Promise<void> {
    try {
      const res = await window.api.resource.delete({ clusterId, namespace, name, target })
      if ('error' in res) {
        message.error(t('resourceDetail.actions.deleteFailed', { error: res.error }))
        return
      }
      message.success(t('resourceDetail.actions.deleted', { name }))
      if (listQueryKey) await queryClient.invalidateQueries({ queryKey: listQueryKey })
      onClose()
    } catch (err) {
      message.error(
        t('resourceDetail.actions.deleteFailed', {
          error: err instanceof Error ? err.message : String(err)
        })
      )
    }
  }

  function confirmDelete(): void {
    Modal.confirm({
      title: t('resourceDetail.actions.deleteTitle', { name }),
      content: t('resourceDetail.actions.deleteBody'),
      okText: t('resourceDetail.actions.delete'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: runDelete
    })
  }

  function openEditor(): void {
    if (!listQueryKey || !openYamlEditor) return
    openYamlEditor({
      title: `Edit: ${name}`,
      clusterId,
      mode: 'edit',
      target,
      namespace,
      name,
      initialYaml: '',
      listQueryKey
    })
  }

  async function copyCmd(cmd: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(cmd)
      message.success(t('resourceDetail.actions.copied'))
    } catch {
      message.error(t('resourceDetail.actions.copyFailed'))
    }
  }

  const nsFlag = namespace ? `-n ${namespace}` : ''
  const kKind = kubectlKind(kind)

  const kubectlItems: MenuProps['items'] = [
    { key: 'get', label: t('resourceDetail.actions.copyGet') },
    { key: 'describe', label: t('resourceDetail.actions.copyDescribe') },
    { key: 'delete', label: t('resourceDetail.actions.copyDelete') },
    { key: 'yaml', label: t('resourceDetail.actions.copyYaml') }
  ]

  function onKubectlClick(key: string): void {
    const map: Record<string, string> = {
      get: `kubectl get ${kKind} ${name} ${nsFlag}`.trim(),
      describe: `kubectl describe ${kKind} ${name} ${nsFlag}`.trim(),
      delete: `kubectl delete ${kKind} ${name} ${nsFlag}`.trim(),
      yaml: `kubectl get ${kKind} ${name} ${nsFlag} -o yaml`.trim()
    }
    void copyCmd(map[key])
  }

  const columnFacts = kindColumnDefs[kind]
    .filter((col) => col.key !== 'tlsHosts')
    .map((col) => ({
      label: col.title,
      value: (item.columns[col.key] as React.ReactNode) ?? '—'
    }))

  const overviewFacts = [
    {
      label: t('resourceDetail.overview.status'),
      value: <StatusTag text={item.statusText} color={item.statusColor} detail={item.statusDetail} />
    },
    { label: t('resourceDetail.overview.age'), value: <AgeCell timestamp={item.ageTimestamp} /> },
    ...(item.namespace
      ? [{ label: t('resourceDetail.overview.namespace'), value: item.namespace as React.ReactNode }]
      : []),
    ...columnFacts,
    ...(parsed?.facts.map((f) => ({ label: f.label, value: f.value as React.ReactNode })) ?? [])
  ]

  // Dedupe facts by label (list columns may overlap with parsed)
  const seen = new Set<string>()
  const dedupedFacts = overviewFacts.filter((f) => {
    if (seen.has(f.label)) return false
    seen.add(f.label)
    return true
  })

  const toolbar = (
    <DetailToolbar>
      <DetailToolButton onClick={() => setActiveTab('yaml')}>
        <Icon icon={FileCode2} variant="detail" />
        {t('resourceDetail.tabs.yaml')}
      </DetailToolButton>
      {listQueryKey && openYamlEditor ? (
        <DetailToolButton onClick={openEditor}>
          <Icon icon={Pencil} variant="detail" />
          {t('resourceDetail.actions.editYaml')}
        </DetailToolButton>
      ) : null}
      <Dropdown menu={{ items: kubectlItems, onClick: ({ key }) => onKubectlClick(key) }} trigger={['click']}>
        <button type="button" className="ml-detail-tool">
          <Icon icon={Copy} variant="detail" />
          {t('resourceDetail.actions.kubectl')}
        </button>
      </Dropdown>
      <DetailToolbarSpacer />
      <DetailToolButton danger onClick={confirmDelete}>
        <Icon icon={Trash2} variant="detail" />
        {t('resourceDetail.actions.delete')}
      </DetailToolButton>
    </DetailToolbar>
  )

  const isSecret = kind === 'Secrets'
  const isConfigMap = kind === 'ConfigMaps'

  const overview = (
    <DetailOverview>
      <DetailSection title={t('resourceDetail.overview.title')}>
        {manifestLoading && !parsed ? <LoadingState /> : <DetailFactGrid facts={dedupedFacts} />}
      </DetailSection>

      <DetailSection title={t('resourceDetail.metadata.title')}>
        <DetailFactGrid
          facts={[
            {
              label: t('resourceDetail.metadata.controlledBy'),
              value:
                parsed && parsed.ownerReferences.length > 0
                  ? parsed.ownerReferences.map((o) => `${o.kind}/${o.name}`).join(', ')
                  : '—'
            },
            {
              label: 'UID',
              value: parsed?.uid ? <DetailMono>{parsed.uid}</DetailMono> : '—'
            },
            {
              label: t('resourceDetail.metadata.apiVersion'),
              value: parsed?.apiVersion ?? '—'
            }
          ]}
        />
        <DetailSubblock label={t('resourceDetail.metadata.labels')}>
          <DetailChips data={parsed?.labels} />
        </DetailSubblock>
        <DetailSubblock label={t('resourceDetail.metadata.annotations')}>
          <DetailKVList data={parsed?.annotations} empty="—" />
        </DetailSubblock>
        {parsed?.selector && Object.keys(parsed.selector).length > 0 ? (
          <DetailSubblock label={t('resourceDetail.metadata.selector')}>
            <DetailChips data={parsed.selector} />
          </DetailSubblock>
        ) : null}
      </DetailSection>

      {parsed && parsed.conditions.length > 0 ? (
        <DetailSection title={t('resourceDetail.conditions.title')}>
          <DetailConditionList conditions={parsed.conditions} />
        </DetailSection>
      ) : null}

      {(isSecret || isConfigMap) && parsed ? (
        <DetailSection
          title={
            isSecret ? t('resourceDetail.data.secretTitle') : t('resourceDetail.data.configMapTitle')
          }
          extra={
            isSecret && parsed.secretType ? <Tag>{parsed.secretType}</Tag> : undefined
          }
        >
          {Object.keys(parsed.data).length ? (
            <DetailKVList data={parsed.data} empty="—" maskValues={isSecret} />
          ) : (
            <DetailEmpty>{t('resourceDetail.data.empty')}</DetailEmpty>
          )}
        </DetailSection>
      ) : null}

      {manifestError ? (
        <Alert type="warning" showIcon message={String(manifestError)} />
      ) : null}
    </DetailOverview>
  )

  const tabItems = [
    {
      key: 'overview',
      label: t('resourceDetail.tabs.overview'),
      children: <DetailPane>{overview}</DetailPane>
    },
    {
      key: 'events',
      label: t('resourceDetail.tabs.events'),
      children: (
        <DetailPane>
          <ResourceEventsPanel
            clusterId={clusterId}
            namespace={namespace}
            name={name}
            target={target}
            isActive={isActive}
          />
        </DetailPane>
      )
    },
    ...(isWorkloadLogKind(kind) && namespace
      ? [
          {
            key: 'pods',
            label: t('resourceDetail.tabs.pods'),
            children: (
              <DetailPane>
                <WorkloadPodsPanel
                  clusterId={clusterId}
                  kind={kind}
                  namespace={namespace}
                  name={name}
                  isActive={isActive && activeTab === 'pods'}
                />
              </DetailPane>
            )
          },
          {
            key: 'logs',
            label: t('resourceDetail.tabs.logs'),
            children: (
              <DetailPane full>
                <WorkloadLogsPanel
                  clusterId={clusterId}
                  kind={kind}
                  namespace={namespace}
                  name={name}
                  isActive={isActive && activeTab === 'logs'}
                />
              </DetailPane>
            )
          }
        ]
      : []),
    ...(kind === 'Services'
      ? [
          {
            key: 'port-forward',
            label: t('resourceDetail.tabs.portForward'),
            children: (
              <DetailPane>
                <ServicePortForwardPanel
                  clusterId={clusterId}
                  namespace={namespace}
                  serviceName={name}
                  isActive={isActive}
                />
              </DetailPane>
            )
          }
        ]
      : []),
    ...(kind === 'Deployments' || kind === 'HorizontalPodAutoscalers'
      ? [
          {
            key: 'replica-history',
            label: t('resourceDetail.tabs.replicaHistory'),
            children: (
              <DetailPane>
                <WorkloadReplicaHistoryPanel
                  clusterId={clusterId}
                  namespace={namespace}
                  resourceName={name}
                  kind={kind as 'Deployments' | 'HorizontalPodAutoscalers'}
                  isActive={isActive}
                />
              </DetailPane>
            )
          }
        ]
      : []),
    ...(kind === 'PersistentVolumeClaims' && namespace
      ? [
          {
            key: 'metrics',
            label: t('resourceDetail.tabs.metrics'),
            children: (
              <DetailPane>
                <PvcMetricsPanel
                  clusterId={clusterId}
                  namespace={namespace}
                  pvcName={name}
                  isActive={isActive && activeTab === 'metrics'}
                />
              </DetailPane>
            )
          }
        ]
      : []),
    ...(kind === 'Nodes'
      ? [
          {
            key: 'pods',
            label: t('resourceDetail.tabs.pods'),
            children: (
              <DetailPane>
                <NodePodsPanel clusterId={clusterId} nodeName={name} isActive={isActive && activeTab === 'pods'} />
              </DetailPane>
            )
          },
          {
            key: 'exec',
            label: t('resourceDetail.tabs.exec'),
            children: (
              <DetailPane full>
                <NodeExecPanel clusterId={clusterId} nodeName={name} isActive={isActive && activeTab === 'exec'} />
              </DetailPane>
            )
          },
          {
            key: 'metrics',
            label: t('resourceDetail.tabs.metrics'),
            children: (
              <DetailPane>
                <NodeMetricsPanel clusterId={clusterId} nodeName={name} isActive={isActive} />
              </DetailPane>
            )
          },
          {
            key: 'pressure',
            label: t('resourceDetail.tabs.pressure'),
            children: (
              <DetailPane>
                <NodePressurePanel clusterId={clusterId} nodeName={name} isActive={isActive} />
              </DetailPane>
            )
          }
        ]
      : []),
    {
      key: 'notes',
      label: t('resourceDetail.tabs.notes'),
      children: (
        <DetailPane>
          <ResourceNotesTab
            clusterId={clusterId}
            resourceKind={kind}
            namespace={namespace === 'ALL' ? '' : namespace}
            resourceName={name}
            isActive={isActive && activeTab === 'notes'}
          />
        </DetailPane>
      )
    },
    {
      key: 'yaml',
      label: t('resourceDetail.tabs.yaml'),
      children: (
        <DetailPane>
          {manifestLoading ? (
            <LoadingState />
          ) : manifestError ? (
            <Alert type="error" showIcon message={String(manifestError)} />
          ) : (
            <pre className="ml-detail-yaml">{manifest ?? ''}</pre>
          )}
        </DetailPane>
      )
    }
  ]

  return (
    <div className="ml-detail">
      {toolbar}
      {isWorkloadKind(kind) && listQueryKey ? (
        <div style={{ padding: '0 16px 8px' }}>
          <WorkloadDetailToolbar
            clusterId={clusterId}
            kind={kind}
            namespace={namespace}
            name={name}
            target={target}
            listQueryKey={listQueryKey}
          />
        </div>
      ) : null}
      <div className="ml-detail__tabs">
        <Tabs
          size="small"
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ height: '100%' }}
          tabBarStyle={{ margin: '0 16px' }}
          destroyOnHidden
        />
      </div>
    </div>
  )
}
