import { useMemo } from 'react'
import type { ResourceListItem } from '@shared/types/resource'
import type { ClusterMetricsSummary } from '@shared/types/metrics'
import { formatBytes, formatCores, percentOf } from '../../format'

/**
 * Fleet-shape widgets derived entirely from data the Nodes page already loads
 * (node list columns + cluster metrics summary) — no extra API calls.
 *
 * Each widget splits into a `*Chip` (status badge, goes in a DetailSection's `extra` slot)
 * and a `*Body` (the row list, goes in the section body) rather than rendering its own card
 * shell, so the Nodes page can wrap them in the same `DetailSection` component the overview
 * pages use and get an identical header/border/spacing treatment for free.
 */

function countBy(values: string[]): { label: string; count: number }[] {
  const map = new Map<string, number>()
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1)
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

function FleetRows({
  rows,
  total,
  matchFirst,
  onNavigateToNode
}: {
  rows: { label: string; count: number }[]
  total: number
  matchFirst: (label: string) => ResourceListItem | undefined
  onNavigateToNode?: (nodeName: string) => void
}): React.JSX.Element {
  if (rows.length === 0) return <span className="ml-detail-empty">No nodes</span>
  return (
    <div className="ml-nodes-fleet-rows">
      {rows.map((row) => {
        const pct = Math.round((row.count / total) * 100)
        const first = matchFirst(row.label)
        return (
          <button
            key={row.label}
            type="button"
            className="ml-nodes-fleet-row"
            onClick={first && onNavigateToNode ? () => onNavigateToNode(first.name) : undefined}
            title={`${row.count} node(s) — ${row.label}`}
          >
            <span className="ml-nodes-fleet-row__label">{row.label}</span>
            <span className="ml-nodes-fleet-row__track">
              <span className="ml-nodes-fleet-row__fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="ml-nodes-fleet-row__value">{row.count}</span>
          </button>
        )
      })}
    </div>
  )
}

function useVersions(nodes: ResourceListItem[]): { label: string; count: number }[] {
  return useMemo(() => countBy(nodes.map((n) => n.columns.version || 'unknown')), [nodes])
}

export function NodesVersionSkewChip({ nodes }: { nodes: ResourceListItem[] }): React.JSX.Element {
  const versions = useVersions(nodes)
  const skewed = versions.length > 1
  return (
    <span className={`ml-nodes-health-chip ml-nodes-health-chip--${skewed ? 'warn' : 'good'}`}>
      {skewed ? `${versions.length} versions` : 'uniform'}
    </span>
  )
}

export function NodesVersionSkewBody({
  nodes,
  onNavigateToNode
}: {
  nodes: ResourceListItem[]
  onNavigateToNode?: (nodeName: string) => void
}): React.JSX.Element {
  const versions = useVersions(nodes)
  return (
    <FleetRows
      rows={versions}
      total={nodes.length}
      matchFirst={(label) => nodes.find((n) => (n.columns.version || 'unknown') === label)}
      onNavigateToNode={onNavigateToNode}
    />
  )
}

function useRoles(nodes: ResourceListItem[]): { label: string; count: number }[] {
  return useMemo(() => countBy(nodes.map((n) => n.columns.roles || '<none>')), [nodes])
}

export function NodesRolesChip({ nodes }: { nodes: ResourceListItem[] }): React.JSX.Element {
  const notReady = nodes.filter((n) => n.statusText !== 'Ready').length
  return (
    <span className={`ml-nodes-health-chip ml-nodes-health-chip--${notReady > 0 ? 'bad' : 'good'}`}>
      {notReady > 0 ? `${notReady} not ready` : `${nodes.length} ready`}
    </span>
  )
}

export function NodesRolesBody({
  nodes,
  onNavigateToNode
}: {
  nodes: ResourceListItem[]
  onNavigateToNode?: (nodeName: string) => void
}): React.JSX.Element {
  const roles = useRoles(nodes)
  return (
    <FleetRows
      rows={roles}
      total={nodes.length}
      matchFirst={(label) => nodes.find((n) => (n.columns.roles || '<none>') === label)}
      onNavigateToNode={onNavigateToNode}
    />
  )
}

/**
 * Capacity vs allocatable — the slice reserved for the kubelet/system that workloads
 * can never schedule into. Easy to overlook when sizing a cluster.
 */
export function NodesCapacityHeadroomBody({ data }: { data: ClusterMetricsSummary }): React.JSX.Element {
  const cpuReserved = Math.max(0, data.cpuCapacityCores - data.cpuAllocatableCores)
  const memReserved = Math.max(0, data.memoryCapacityBytes - data.memoryAllocatableBytes)
  const podsUsed = data.runningPods + data.pendingPods + data.failedPods

  const facts = [
    {
      label: 'CPU capacity',
      value: formatCores(data.cpuCapacityCores),
      hint: `${formatCores(data.cpuAllocatableCores)} allocatable`
    },
    {
      label: 'CPU reserved',
      value: formatCores(cpuReserved),
      hint: `${percentOf(cpuReserved, data.cpuCapacityCores) ?? 0}% of capacity`
    },
    {
      label: 'Memory capacity',
      value: formatBytes(data.memoryCapacityBytes),
      hint: `${formatBytes(data.memoryAllocatableBytes)} allocatable`
    },
    {
      label: 'Memory reserved',
      value: formatBytes(memReserved),
      hint: `${percentOf(memReserved, data.memoryCapacityBytes) ?? 0}% of capacity`
    },
    {
      label: 'Pod slots',
      value: `${podsUsed} / ${data.podCapacity}`,
      hint: `${percentOf(podsUsed, data.podCapacity) ?? 0}% used`
    },
    {
      label: 'Nodes',
      value: `${data.readyNodes} / ${data.totalNodes}`,
      hint: data.notReadyNodes > 0 ? `${data.notReadyNodes} not ready` : 'all ready'
    }
  ]

  return (
    <div className="ml-nodes-capacity-grid">
      {facts.map((f) => (
        <div key={f.label} className="ml-nodes-capacity-cell">
          <span className="ml-nodes-capacity-cell__label">{f.label}</span>
          <span className="ml-nodes-capacity-cell__value">{f.value}</span>
          <span className="ml-nodes-capacity-cell__hint">{f.hint}</span>
        </div>
      ))}
    </div>
  )
}
