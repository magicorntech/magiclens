import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceListItem } from '@shared/types/resource'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'

export interface TerminalTabState {
  id: string
  kind: 'terminal'
  title: string
  clusterId: string
}

export interface YamlTabState {
  id: string
  kind: 'yaml'
  title: string
  clusterId: string
  mode: 'edit' | 'create'
  target?: ResourceMutationTarget
  namespace: string
  name?: string
  initialYaml: string
  /** React Query key of the list this edit/create affects — invalidated (only this key) on success. */
  listQueryKey: unknown[]
}

export interface ResourceDetailTabState {
  id: string
  kind: 'resource-detail'
  title: string
  clusterId: string
  resourceKind: ResourceKind
  namespace: string
  item: ResourceListItem
}

export type BottomPanelTab = TerminalTabState | YamlTabState | ResourceDetailTabState

interface OpenYamlEditorParams {
  title: string
  clusterId: string
  mode: 'edit' | 'create'
  target?: ResourceMutationTarget
  namespace: string
  name?: string
  initialYaml: string
  listQueryKey: unknown[]
}

interface OpenResourceDetailParams {
  clusterId: string
  resourceKind: ResourceKind
  namespace: string
  item: ResourceListItem
}

interface BottomPanelContextValue {
  tabs: BottomPanelTab[]
  activeTabId: string | null
  addTerminalTab: () => void
  openYamlEditor: (params: OpenYamlEditorParams) => void
  openResourceDetail: (params: OpenResourceDetailParams) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  closeAll: () => void
}

const BottomPanelContext = createContext<BottomPanelContextValue | null>(null)

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Scoped per `AppShell` instance (i.e. per open cluster tab) — deliberately NOT a global store,
 * so terminal/YAML editor tabs never leak between different clusters' bottom panels. */
export function BottomPanelProvider({ children, clusterId }: { children: ReactNode; clusterId: string }): React.JSX.Element {
  const [tabs, setTabs] = useState<BottomPanelTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const terminalCounterRef = useRef(0)

  const addTerminalTab = useCallback(() => {
    terminalCounterRef.current += 1
    const id = newId('term')
    const tab: TerminalTabState = { id, kind: 'terminal', title: `Terminal ${terminalCounterRef.current}`, clusterId }
    setTabs((prev) => [...prev, tab])
    setActiveTabId(id)
  }, [clusterId])

  const openYamlEditor = useCallback((params: OpenYamlEditorParams) => {
    const id = newId('yaml')
    const tab: YamlTabState = { id, kind: 'yaml', ...params }
    setTabs((prev) => [...prev, tab])
    setActiveTabId(id)
  }, [])

  const openResourceDetail = useCallback((params: OpenResourceDetailParams) => {
    setTabs((prev) => {
      const existing = prev.find(
        (t) =>
          t.kind === 'resource-detail' &&
          t.clusterId === params.clusterId &&
          t.resourceKind === params.resourceKind &&
          t.item.id === params.item.id
      )
      if (existing) {
        setActiveTabId(existing.id)
        return prev.map((t) =>
          t.id === existing.id && t.kind === 'resource-detail' ? { ...t, item: params.item } : t
        )
      }
      const id = newId('detail')
      const tab: ResourceDetailTabState = {
        id,
        kind: 'resource-detail',
        title: params.item.name,
        clusterId: params.clusterId,
        resourceKind: params.resourceKind,
        namespace: params.namespace,
        item: params.item
      }
      setActiveTabId(id)
      return [...prev, tab]
    })
  }, [])

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)
      setActiveTabId((current) => (current === id ? (next[Math.max(0, idx - 1)]?.id ?? null) : current))
      return next
    })
  }, [])

  const setActiveTab = useCallback((id: string) => setActiveTabId(id), [])
  const closeAll = useCallback(() => {
    setTabs([])
    setActiveTabId(null)
  }, [])

  const value = useMemo<BottomPanelContextValue>(
    () => ({
      tabs,
      activeTabId,
      addTerminalTab,
      openYamlEditor,
      openResourceDetail,
      closeTab,
      setActiveTab,
      closeAll
    }),
    [tabs, activeTabId, addTerminalTab, openYamlEditor, openResourceDetail, closeTab, setActiveTab, closeAll]
  )

  return <BottomPanelContext.Provider value={value}>{children}</BottomPanelContext.Provider>
}

export function useBottomPanel(): BottomPanelContextValue {
  const ctx = useContext(BottomPanelContext)
  if (!ctx) throw new Error('useBottomPanel must be used within a BottomPanelProvider')
  return ctx
}

/** Like `useBottomPanel`, but returns null instead of throwing when no provider is mounted above —
 * for components (e.g. dialogs rendered outside `AppShell`) that only want to open a YAML editor
 * opportunistically when the docked panel is available. */
export function useBottomPanelOptional(): BottomPanelContextValue | null {
  return useContext(BottomPanelContext)
}
