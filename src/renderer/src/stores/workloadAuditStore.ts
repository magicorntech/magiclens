import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkloadActionId, WorkloadAuditEntry } from '@shared/types/workload'

interface WorkloadAuditState {
  entries: WorkloadAuditEntry[]
  addEntry: (entry: Omit<WorkloadAuditEntry, 'id' | 'timestamp'> & { timestamp?: string }) => void
  clearCluster: (clusterId: string) => void
}

export const useWorkloadAuditStore = create<WorkloadAuditState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            {
              ...entry,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: entry.timestamp ?? new Date().toISOString()
            },
            ...state.entries
          ].slice(0, 500)
        })),
      clearCluster: (clusterId) =>
        set((state) => ({ entries: state.entries.filter((e) => e.clusterId !== clusterId) }))
    }),
    { name: 'magiclens-workload-audit' }
  )
)

export function recordWorkloadAudit(
  entry: Omit<WorkloadAuditEntry, 'id' | 'timestamp'> & { timestamp?: string }
): void {
  useWorkloadAuditStore.getState().addEntry(entry)
}

const SECRET_MATERIAL_RE = /-----BEGIN [A-Z0-9 ]*(?:PRIVATE KEY|CERTIFICATE)-----/i

/** Scale and restart commands are patches. Hide anything that looks like a Secret body. */
export function workloadAuditCommandText(command: string | undefined): string | null {
  const text = command?.trim()
  if (!text || SECRET_MATERIAL_RE.test(text)) return null
  return text
}

/** Drop error text that contains key or certificate material. */
export function workloadAuditErrorText(error: string | undefined): string | undefined {
  if (!error) return undefined
  if (SECRET_MATERIAL_RE.test(error)) return undefined
  return error.length > 400 ? `${error.slice(0, 400)}…` : error
}
