import { create } from 'zustand'
import type { SecurityReport, SecurityVulnerability } from '@shared/types/security'

interface SecurityStoreState {
  reportsByCluster: Record<string, SecurityReport>
  /** Focus a finding when opening Security from search */
  focusFindingId: string | null
  /** Focus a rule book entry */
  focusRuleId: string | null
  setReport: (clusterId: string, report: SecurityReport) => void
  focusFinding: (findingId: string | null) => void
  focusRule: (ruleId: string | null) => void
  clearFocus: () => void
  getReport: (clusterId: string) => SecurityReport | null
  findVulnerability: (clusterId: string, findingId: string) => SecurityVulnerability | null
}

export const useSecurityStore = create<SecurityStoreState>((set, get) => ({
  reportsByCluster: {},
  focusFindingId: null,
  focusRuleId: null,
  setReport: (clusterId, report) =>
    set((s) => ({
      reportsByCluster: { ...s.reportsByCluster, [clusterId]: report }
    })),
  focusFinding: (focusFindingId) => set({ focusFindingId, focusRuleId: null }),
  focusRule: (focusRuleId) => set({ focusRuleId, focusFindingId: null }),
  clearFocus: () => set({ focusFindingId: null, focusRuleId: null }),
  getReport: (clusterId) => get().reportsByCluster[clusterId] ?? null,
  findVulnerability: (clusterId, findingId) => {
    const report = get().reportsByCluster[clusterId]
    return report?.vulnerabilities.find((v) => v.id === findingId) ?? null
  }
}))
