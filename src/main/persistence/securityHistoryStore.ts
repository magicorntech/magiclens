import Store from 'electron-store'
import { randomUUID } from 'crypto'
import type {
  SecurityHistoryRecord,
  SecurityHistorySummary,
  SecurityReport
} from '@shared/types/security'

const MAX_PER_CLUSTER = 30

interface StoreSchema {
  byCluster: Record<string, SecurityHistoryRecord[]>
}

const store = new Store<StoreSchema>({
  name: 'security-history',
  defaults: { byCluster: {} }
})

function defaultName(scannedAt: string): string {
  const d = new Date(scannedAt)
  if (!Number.isFinite(d.getTime())) return 'Scan'
  const stamp = d.toISOString().slice(0, 16).replace('T', ' ')
  return `Scan · ${stamp}`
}

function normalizeRecord(raw: SecurityHistoryRecord): SecurityHistoryRecord {
  return {
    ...raw,
    name: (raw.name && raw.name.trim()) || defaultName(raw.scannedAt)
  }
}

function toSummary(record: SecurityHistoryRecord): SecurityHistorySummary {
  const normalized = normalizeRecord(record)
  const { report: _report, ...summary } = normalized
  return summary
}

function countsFromReport(report: SecurityReport): Pick<
  SecurityHistorySummary,
  'findingCount' | 'critical' | 'high' | 'medium' | 'low'
> {
  const critical = report.severityCounts.find((s) => s.level === 'Critical')?.count ?? 0
  const high = report.severityCounts.find((s) => s.level === 'High')?.count ?? 0
  const medium = report.severityCounts.find((s) => s.level === 'Medium')?.count ?? 0
  const low = report.severityCounts.find((s) => s.level === 'Low')?.count ?? 0
  return {
    findingCount: report.vulnerabilities.length,
    critical,
    high,
    medium,
    low
  }
}

export function saveSecurityScan(
  report: SecurityReport,
  name?: string
): SecurityHistoryRecord {
  const record: SecurityHistoryRecord = {
    id: randomUUID(),
    clusterId: report.clusterId,
    scannedAt: report.scannedAt,
    name: (name && name.trim()) || defaultName(report.scannedAt),
    score: report.score,
    riskLabel: report.riskLabel,
    ...countsFromReport(report),
    entryPointCount: report.entryPoints.length,
    vectorCount: report.vectors.length,
    flags: report.flags,
    report
  }
  const all = store.get('byCluster')
  const list = [...(all[report.clusterId] ?? [])]
  list.unshift(record)
  all[report.clusterId] = list.slice(0, MAX_PER_CLUSTER)
  store.set('byCluster', all)
  return record
}

export function listSecurityHistory(clusterId: string): SecurityHistorySummary[] {
  const list = store.get('byCluster')[clusterId] ?? []
  return list.map(toSummary)
}

export function getSecurityHistory(
  clusterId: string,
  id: string
): SecurityHistoryRecord | null {
  const list = store.get('byCluster')[clusterId] ?? []
  const found = list.find((r) => r.id === id)
  return found ? normalizeRecord(found) : null
}

export function renameSecurityHistory(
  clusterId: string,
  id: string,
  name: string
): SecurityHistoryRecord | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const all = store.get('byCluster')
  const list = [...(all[clusterId] ?? [])]
  const idx = list.findIndex((r) => r.id === id)
  if (idx < 0) return null
  list[idx] = { ...list[idx], name: trimmed }
  all[clusterId] = list
  store.set('byCluster', all)
  return normalizeRecord(list[idx])
}

export function deleteSecurityHistory(clusterId: string, id: string): boolean {
  const all = store.get('byCluster')
  const list = all[clusterId] ?? []
  const next = list.filter((r) => r.id !== id)
  if (next.length === list.length) return false
  all[clusterId] = next
  store.set('byCluster', all)
  return true
}

export function clearSecurityHistory(clusterId: string): void {
  const all = store.get('byCluster')
  all[clusterId] = []
  store.set('byCluster', all)
}
