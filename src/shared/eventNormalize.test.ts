import { describe, expect, it } from 'vitest'
import type { EventsV1Event, V1Pod } from '@kubernetes/client-node'
import { eventsV1ToCore, podStatusEventsFromPod, selectOwnedPods } from '../main/k8s/eventsService'

describe('event normalize', () => {
  it('reads an events.k8s.io OOM note as a core event message', () => {
    const event = {
      metadata: { name: 'pod.1', namespace: 'shop', uid: 'e1' },
      reason: 'OOMKilling',
      note: 'Memory cgroup out of memory: Kill process in container app',
      type: 'Warning',
      eventTime: new Date('2026-10-22T12:00:00Z'),
      regarding: { kind: 'Pod', name: 'api-0', namespace: 'shop' },
      reportingController: 'kubelet'
    } as EventsV1Event
    const core = eventsV1ToCore(event)
    expect(core.message).toContain('out of memory')
    expect(core.reason).toBe('OOMKilling')
    expect(core.involvedObject?.name).toBe('api-0')
    expect(core.source?.component).toBe('kubelet')
  })

  it('keeps an OOMKilled container status after the Event object is gone', () => {
    const pod = {
      status: {
        containerStatuses: [
          {
            name: 'app',
            restartCount: 3,
            lastState: {
              terminated: {
                reason: 'OOMKilled',
                exitCode: 137,
                finishedAt: new Date('2026-10-22T12:04:00Z')
              }
            }
          }
        ]
      }
    } as V1Pod
    const rows = podStatusEventsFromPod(pod, 'shop', 'api-0')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.reason).toBe('OOMKilled')
    expect(rows[0]?.message).toContain('app')
    expect(rows[0]?.count).toBe(3)
  })

  it('selects pods owned by a ReplicaSet of a Deployment', () => {
    const pods = [
      { metadata: { name: 'api-0', ownerReferences: [{ kind: 'ReplicaSet', name: 'api-abc' }] } },
      { metadata: { name: 'other', ownerReferences: [{ kind: 'ReplicaSet', name: 'web-xyz' }] } }
    ] as V1Pod[]
    const owned = selectOwnedPods(pods, [{ kind: 'ReplicaSet', name: 'api-abc' }])
    expect(owned.map((pod) => pod.metadata?.name)).toEqual(['api-0'])
  })
})
