import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { VisualizerNode } from '@shared/types/visualizer'
import { matchWorkloadIcon } from '../../icons/workloadIcons'
import type { VizFrameVariant } from './visualizerLayout'

export type VizFrameData = {
  variant: VizFrameVariant
  label: string
}

export type VizServiceData = {
  node: VisualizerNode
}

export type VizWorkloadData = {
  node: VisualizerNode
}

type FrameNode = Node<VizFrameData, 'vizFrame'>
type ServiceNode = Node<VizServiceData, 'vizService'>
type WorkloadNode = Node<VizWorkloadData, 'vizWorkload'>

function FrameInner({ data }: NodeProps<FrameNode>): React.JSX.Element {
  const variant = data?.variant ?? 'instance'
  return (
    <div className={`ml-viz-frame ml-viz-frame--${variant}`}>
      <span className="ml-viz-frame__label">{data?.label || '—'}</span>
    </div>
  )
}

function ServiceInner({ data }: NodeProps<ServiceNode>): React.JSX.Element {
  const node = data?.node
  if (!node) return <div className="ml-viz-svc" />
  const ports = (node.ports ?? []).slice(0, 4)
  return (
    <div className={`ml-viz-svc ml-viz-svc--${node.status}`} title={node.name}>
      <Handle type="target" position={Position.Top} className="ml-viz-handle" />
      <div className="ml-viz-svc__head">
        <span className="ml-viz-svc__icon" aria-hidden />
        <span className="ml-viz-svc__name">{node.name}</span>
      </div>
      <div className="ml-viz-svc__type">Service: {node.serviceType || 'ClusterIP'}</div>
      <div className="ml-viz-svc__ports">
        {ports.length === 0 ? (
          <div className="ml-viz-svc__port">
            <span>—</span>
          </div>
        ) : (
          ports.map((p) => (
            <div key={`${p.port}-${p.name ?? ''}`} className="ml-viz-svc__port">
              <span>{p.port}</span>
              <span>{p.name || (p.protocol || 'TCP').toLowerCase()}</span>
            </div>
          ))
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="ml-viz-handle" />
    </div>
  )
}

function replicaSlots(ready: number, desired: number): Array<'on' | 'off'> {
  const total = Math.max(desired, ready, 0)
  const shown = Math.min(Math.max(total, 1), 10)
  return Array.from({ length: shown }, (_, i) => (i < ready ? 'on' : 'off'))
}

function WorkloadInner({ data }: NodeProps<WorkloadNode>): React.JSX.Element {
  const node = data?.node
  if (!node) return <div className="ml-viz-wl" />
  const icon = matchWorkloadIcon(node.images, node.name, node.instance)
  const slots = replicaSlots(node.replicasReady ?? 0, node.replicasDesired ?? 0)
  return (
    <div className={`ml-viz-wl ml-viz-wl--${node.status}`} title={`${node.kind} ${node.name}`}>
      <Handle type="target" position={Position.Top} className="ml-viz-handle" />
      {(node.hasIngress || node.hasEgress) && (
        <div className="ml-viz-wl__chips">
          {node.hasIngress ? (
            <span className="ml-viz-chip">
              <span className="ml-viz-chip__x" aria-hidden>
                ×
              </span>
              Ingress
            </span>
          ) : null}
          {node.hasEgress ? (
            <span className="ml-viz-chip">
              <span className="ml-viz-chip__x" aria-hidden>
                ×
              </span>
              Egress
            </span>
          ) : null}
        </div>
      )}
      <div className="ml-viz-wl__head">
        <span className="ml-viz-wl__kind-icon" aria-hidden />
        <span className="ml-viz-wl__name">{node.name}</span>
      </div>
      <div className="ml-viz-wl__body">
        {icon ? <img src={icon} alt="" className="ml-viz-wl__logo" draggable={false} /> : null}
      </div>
      <div className="ml-viz-wl__replicas" aria-label={`${node.replicasReady ?? 0}/${node.replicasDesired ?? 0}`}>
        {slots.map((slot, i) => (
          <span key={i} className={`ml-viz-replica ml-viz-replica--${slot}`} />
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="ml-viz-handle" />
    </div>
  )
}

export const VisualizerFrameNode = memo(FrameInner)
export const VisualizerServiceNode = memo(ServiceInner)
export const VisualizerWorkloadNode = memo(WorkloadInner)
