import { describe, expect, it } from 'vitest'
import type { ResourceListItem } from '@shared/types/resource'
import { podMetricsKey } from '../../queries/usePodTableMetrics'
import { compareUsageRatio } from '../../utils/tableSort'
import { hpaTargetUsage, type HpaTargetUsage } from './hpaUsage'

function row(name: string, namespace: string, columns: Record<string, string>): ResourceListItem {
  return {
    id: `${namespace}/${name}`,
    name,
    namespace,
    ageTimestamp: null,
    statusText: 'Running',
    statusColor: 'green',
    columns
  }
}

function sortByCpu(left: HpaTargetUsage, right: HpaTargetUsage, order: 'ascend' | 'descend'): number {
  return compareUsageRatio(
    left.hasUsage ? left.cpuUsage : undefined,
    left.cpuRequest,
    right.hasUsage ? right.cpuUsage : undefined,
    right.cpuRequest,
    order
  )
}

describe('hpaTargetUsage', () => {
  it('sums pods owned by replica sets of a Deployment, not pods that only share a name prefix', () => {
    const current = row('web-abc', 'shop', { controlledBy: 'Deployment/web' })
    const previous = row('web-old', 'shop', { controlledBy: 'Deployment/web' })
    const unrelated = row('web-other', 'shop', { controlledBy: 'Deployment/api' })
    const pods = [
      row('web-abc-xyz', 'shop', {
        controlledBy: 'ReplicaSet/web-abc',
        cpuRequest: '0.25',
        memoryRequest: '100'
      }),
      row('web-old-pod', 'shop', {
        controlledBy: 'ReplicaSet/web-old',
        cpuRequest: '0.5',
        memoryRequest: '40'
      }),
      row('web-extra', 'shop', {
        controlledBy: 'ReplicaSet/web-other',
        cpuRequest: '4',
        memoryRequest: '400'
      }),
      row('web', 'shop', {
        controlledBy: 'ReplicaSet/not-the-deployment',
        cpuRequest: '8',
        memoryRequest: '800'
      })
    ]
    const metrics = new Map([
      [podMetricsKey('shop', 'web-abc-xyz'), { cpu: 0.25, memory: 30 }],
      [podMetricsKey('shop', 'web-old-pod'), { cpu: 0.5, memory: 10 }],
      [podMetricsKey('shop', 'web-extra'), { cpu: 3, memory: 300 }],
      [podMetricsKey('shop', 'web'), { cpu: 7, memory: 700 }]
    ])

    const result = hpaTargetUsage('Deployment/web', pods, [current, previous, unrelated], metrics)

    expect(result).toEqual({
      cpuUsage: 0.75,
      memoryUsage: 40,
      cpuRequest: 0.75,
      memoryRequest: 140,
      hasUsage: true
    })
  })

  it('does not attach a pod to a replica set in another namespace', () => {
    const shopReplicaSet = row('web-abc', 'shop', { controlledBy: 'Deployment/web' })
    const pods = [
      row('web-abc-a', 'shop', {
        controlledBy: 'ReplicaSet/web-abc',
        cpuRequest: '0.25',
        memoryRequest: '10'
      }),
      row('web-abc-x', 'other', {
        controlledBy: 'ReplicaSet/web-abc',
        cpuRequest: '1',
        memoryRequest: '90'
      })
    ]
    const metrics = new Map([
      [podMetricsKey('shop', 'web-abc-a'), { cpu: 0.1, memory: 4 }],
      [podMetricsKey('other', 'web-abc-x'), { cpu: 9, memory: 9 }]
    ])

    const result = hpaTargetUsage('Deployment/web', pods, [shopReplicaSet], metrics)

    expect(result.cpuUsage).toBe(0.1)
    expect(result.memoryUsage).toBe(4)
    expect(result.cpuRequest).toBe(0.25)
    expect(result.memoryRequest).toBe(10)
  })

  it('matches a StatefulSet to pods whose controlledBy is that StatefulSet', () => {
    const pods = [
      row('web-0', 'shop', {
        controlledBy: 'StatefulSet/web',
        cpuRequest: '0.5',
        memoryRequest: '128'
      }),
      row('web-1', 'shop', {
        controlledBy: 'StatefulSet/other',
        cpuRequest: '9',
        memoryRequest: '9'
      }),
      row('web-abc-pod', 'shop', {
        controlledBy: 'ReplicaSet/web-abc',
        cpuRequest: '4',
        memoryRequest: '4'
      })
    ]
    const metrics = new Map([
      [podMetricsKey('shop', 'web-0'), { cpu: 0.25, memory: 64 }],
      [podMetricsKey('shop', 'web-1'), { cpu: 8, memory: 8 }],
      [podMetricsKey('shop', 'web-abc-pod'), { cpu: 3, memory: 3 }]
    ])

    const result = hpaTargetUsage('StatefulSet/web', pods, [], metrics)

    expect(result).toEqual({
      cpuUsage: 0.25,
      memoryUsage: 64,
      cpuRequest: 0.5,
      memoryRequest: 128,
      hasUsage: true
    })
  })

  it('matches a ReplicaSet target to pods controlled by that ReplicaSet', () => {
    const pods = [
      row('web-abc-xyz', 'shop', {
        controlledBy: 'ReplicaSet/web-abc',
        cpuRequest: '0.2',
        memoryRequest: '20'
      }),
      row('web-0', 'shop', {
        controlledBy: 'StatefulSet/web',
        cpuRequest: '1',
        memoryRequest: '1'
      })
    ]
    const metrics = new Map([[podMetricsKey('shop', 'web-abc-xyz'), { cpu: 0.1, memory: 5 }]])

    const result = hpaTargetUsage('ReplicaSet/web-abc', pods, [], metrics)

    expect(result.cpuUsage).toBe(0.1)
    expect(result.memoryUsage).toBe(5)
    expect(result.cpuRequest).toBe(0.2)
    expect(result.hasUsage).toBe(true)
  })

  it('keeps empty usage distinguishable so a descending sort sinks the row', () => {
    const pod = row('web-0', 'shop', {
      controlledBy: 'StatefulSet/web',
      cpuRequest: '0.5',
      memoryRequest: '128'
    })
    const empty = hpaTargetUsage(
      'StatefulSet/web',
      [pod],
      [],
      new Map([[podMetricsKey('shop', 'someone-else'), { cpu: 1, memory: 1 }]])
    )
    const filled = hpaTargetUsage(
      'StatefulSet/web',
      [pod],
      [],
      new Map([[podMetricsKey('shop', 'web-0'), { cpu: 0.25, memory: 64 }]])
    )

    expect(empty.hasUsage).toBe(false)
    expect(empty.cpuUsage).toBe(0)
    expect(empty.memoryUsage).toBe(0)
    expect(empty.cpuRequest).toBe(0.5)
    expect(filled.hasUsage).toBe(true)
    expect(sortByCpu(empty, filled, 'descend')).toBeLessThan(0)
    expect(sortByCpu(filled, empty, 'descend')).toBeGreaterThan(0)
  })
})
