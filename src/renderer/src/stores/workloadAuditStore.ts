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
