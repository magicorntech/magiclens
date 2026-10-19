import { createFolder, createNote, listNotes } from './vaultStore'
import { isDemoMode } from '../demoUserData'

/** Demo mode only: fills the Sparks vault with a believable on-call notebook — runbooks, incidents,
 *  capacity notes — linked with [[wiki links]] so the graph has something to draw. Idempotent. */
export function seedDemoNotes(): void {
  if (!isDemoMode()) return
  if (listNotes().some((n) => n.title === 'Rollout Runbook')) return

  const hours = (h: number): string => new Date(Date.now() + h * 3_600_000).toISOString()

  for (const f of ['Runbooks', 'Incidents', 'Clusters/aurora-prod']) createFolder(f)

  createNote({
    title: 'Start Here',
    folder: 'Inbox',
    pinned: true,
    tags: ['welcome'],
    body: [
      '# Aurora platform — on-call hub',
      '',
      'Everything the on-call engineer needs, one click from the cluster it describes.',
      '',
      '## Runbooks',
      '- [[Rollout Runbook]] — ship a change safely',
      '- [[Rollback Playbook]] — undo it faster',
      '- [[Helm upgrade checklist]] and [[Ingress certificate renewal]]',
      '',
      '## Recent incidents',
      '- [[Incident 2026-10-12 image-resizer]] — 1 of 2 replicas down',
      '- [[Postmortem checkout latency]] — connection pool exhaustion',
      '',
      '## Capacity',
      '- [[Node pool sizing]] · [[Cost review Q4]]',
      '',
      '## Who is on call',
      '| Week | Primary | Secondary |',
      '|---|---|---|',
      '| This week | Deniz | Mert |',
      '| Next week | Ece | Deniz |',
      '',
      '> Tip: press `Cmd+K` to jump to any note, cluster or resource.',
      '',
      'See the rota in [[On-call rota]].'
    ].join('\n')
  })

  createNote({
    title: 'Rollout Runbook',
    folder: 'Runbooks',
    tags: ['runbook', 'deploy'],
    body: [
      '# Rollout Runbook',
      '',
      'Use for any change to a customer-facing deployment in the `shop` namespace.',
      '',
      '## Before you start',
      '1. Check headroom in [[Node pool sizing]] — stay under 70% CPU.',
      '2. Confirm no open incident in [[Start Here]].',
      '3. Pick the version and note it below.',
      '',
      '## Roll out',
      '```bash',
      'kubectl set image deploy/storefront web=registry.aurora.io/storefront:v2.14.0 -n shop',
      'kubectl rollout status deploy/storefront -n shop --timeout=5m',
      '```',
      '',
      '## Gates',
      '| Gate | Where to look | Pass when |',
      '|---|---|---|',
      '| Rollout | Deployments → storefront | 5/5 ready |',
      '| Errors | Timeline | no new Warning events |',
      '| Traffic | Topology | ingress → pods all green |',
      '',
      '## Checklist',
      '- [x] Freeze window confirmed',
      '- [x] Canary healthy for 10 minutes',
      '- [ ] Notify #payments',
      '- [ ] Update [[Incident 2026-10-12 image-resizer]] with the fix version',
      '',
      'If a gate fails, follow the [[Rollback Playbook]].'
    ].join('\n')
  })

  createNote({
    title: 'Rollback Playbook',
    folder: 'Runbooks',
    tags: ['runbook', 'deploy'],
    body: [
      '# Rollback Playbook',
      '',
      '> Roll back first, investigate second.',
      '',
      '```bash',
      'kubectl rollout undo deploy/storefront -n shop',
      'kubectl rollout status deploy/storefront -n shop',
      '```',
      '',
      '## After the rollback',
      '- [ ] Post in #incidents with the failing version',
      '- [ ] Open a note under Incidents and link it from [[Start Here]]',
      '- [ ] Revisit the gates in [[Rollout Runbook]]'
    ].join('\n')
  })

  createNote({
    title: 'Ingress certificate renewal',
    folder: 'Runbooks',
    tags: ['runbook', 'tls'],
    body: [
      '# Ingress certificate renewal',
      '',
      'cert-manager renews 30 days before expiry. We check 14 days early.',
      '',
      '| Host | Issuer | Expires |',
      '|---|---|---|',
      '| shop.aurora.io | letsencrypt-prod | in 41 days |',
      '| api.aurora.io | letsencrypt-prod | in 38 days |',
      '| admin.aurora.io | internal-ca | in 212 days |',
      '',
      '- [x] Verify on the Timeline page that no `CertificateFailed` events exist',
      '- [ ] Update [[Friday on-call handoff]]'
    ].join('\n')
  })

  createNote({
    title: 'Helm upgrade checklist',
    folder: 'Runbooks',
    tags: ['runbook', 'helm'],
    body: [
      '# Helm upgrade checklist',
      '',
      '1. Read the chart diff in the Helm page',
      '2. Upgrade **staging** first',
      '3. Follow the [[Rollout Runbook]]',
      '4. Record anything odd in [[Start Here]]',
      '',
      '```bash',
      'helm upgrade storefront aurora/storefront -n shop --reuse-values --atomic',
      '```'
    ].join('\n')
  })

  createNote({
    title: 'Incident 2026-10-12 image-resizer',
    folder: 'Incidents',
    tags: ['incident', 'shop'],
    scope: 'resource',
    clusterId: 'demo-aurora-prod',
    resourceKind: 'Deployments',
    namespace: 'shop',
    resourceName: 'image-resizer',
    remindAt: hours(3),
    body: [
      '# image-resizer degraded (1/2 ready)',
      '',
      '| | |',
      '|---|---|',
      '| **Severity** | SEV-3 |',
      '| **Impact** | slower product images, no checkout impact |',
      '| **Cluster** | aurora-prod / shop |',
      '| **Status** | mitigating |',
      '',
      '## Timeline',
      '| Time | Event |',
      '|---|---|',
      '| 14:02 | rollout started |',
      '| 14:05 | Warning `Failed` ×6 on image-resizer-7f8d9c-b3k |',
      '| 14:11 | readiness probe returns 503 |',
      '| 14:20 | registry mirror found rate-limited |',
      '',
      '## Root cause',
      'The mirror throttled pulls after the rollout, so one replica never became ready.',
      '',
      '## Follow-ups',
      '- [x] Switch to the primary registry',
      '- [ ] Add the mirror limit to [[Rollout Runbook]]',
      '- [ ] Re-check [[Node pool sizing]]',
      '',
      'Related: [[Postmortem checkout latency]].'
    ].join('\n')
  })

  createNote({
    title: 'Postmortem checkout latency',
    folder: 'Incidents',
    tags: ['incident', 'payments'],
    body: [
      '# Postmortem: checkout latency',
      '',
      '**Root cause:** connection pool exhaustion in `checkout-api` during the evening peak.',
      '',
      '## What went well',
      '- Alert fired within 2 minutes',
      '- [[Rollback Playbook]] worked as written',
      '',
      '## Actions',
      '- [x] Raise the pool size',
      '- [ ] Capacity review: [[Node pool sizing]], [[Cost review Q4]]',
      '- [ ] Certificates: [[Ingress certificate renewal]]'
    ].join('\n')
  })

  createNote({
    title: 'Node pool sizing',
    folder: 'Clusters/aurora-prod',
    tags: ['capacity'],
    scope: 'cluster',
    clusterId: 'demo-aurora-prod',
    body: [
      '# Node pool sizing',
      '',
      '| Pool | Nodes | CPU | Memory | Note |',
      '|---|---|---|---|---|',
      '| aurora-pool-a | 3 | 36% | 46% | on-demand |',
      '| aurora-pool-b | 2 | 28% | 41% | spot |',
      '| aurora-cp | 2 | 22% | 38% | control plane |',
      '',
      '**Target:** stay under 70% CPU.',
      '',
      '- [ ] Add one worker to pool A before the next big rollout',
      '- [ ] Review spot interruptions in [[Cost review Q4]]',
      '',
      'Linked from [[Start Here]] and [[Rollout Runbook]].'
    ].join('\n')
  })

  createNote({
    title: 'Argo CD sync policy',
    folder: 'Clusters/aurora-prod',
    tags: ['argocd'],
    body: [
      '# Argo CD sync policy',
      '',
      '| App | Policy |',
      '|---|---|',
      '| storefront | auto-sync + self-heal |',
      '| checkout | **manual sync** (by design) |',
      '| search-index | auto-sync |',
      '',
      'checkout stays OutOfSync until the release is approved — see [[Friday on-call handoff]] and [[Helm upgrade checklist]].'
    ].join('\n')
  })

  createNote({
    title: 'Cost review Q4',
    folder: 'Clusters/aurora-prod',
    tags: ['capacity', 'cost'],
    body: [
      '# Cost review Q4',
      '',
      '| Item | Monthly | Change |',
      '|---|---|---|',
      '| On-demand pool | $4,120 | — |',
      '| Spot pool | $1,430 | −31% |',
      '| Load balancers | $610 | +4% |',
      '',
      'Capacity inputs come from [[Node pool sizing]].'
    ].join('\n')
  })

  createNote({
    title: 'Friday on-call handoff',
    folder: 'Journal',
    tags: ['journal'],
    remindAt: hours(26),
    body: [
      '# Handoff',
      '',
      '- Keep an eye on the `catalog-idx` PVC (78% full)',
      '- Argo app `checkout` is OutOfSync by design — [[Argo CD sync policy]]',
      '- Open: [[Incident 2026-10-12 image-resizer]]',
      '- See [[Rollout Runbook]] before shipping anything',
      '',
      '— Deniz'
    ].join('\n')
  })

  createNote({
    title: 'On-call rota',
    folder: 'Journal',
    tags: ['journal'],
    body: [
      '# On-call rota',
      '',
      'Weekly rotation. Handoff template: [[Friday on-call handoff]].',
      '',
      '| Week | Primary | Secondary |',
      '|---|---|---|',
      '| 42 | Deniz | Mert |',
      '| 43 | Ece | Deniz |',
      '| 44 | Mert | Ece |',
      '',
      'Incidents land in [[Postmortem checkout latency]].'
    ].join('\n')
  })
}
