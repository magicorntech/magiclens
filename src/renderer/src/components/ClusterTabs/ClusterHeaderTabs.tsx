import { useEffect, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useClusterStore, type ClusterEntry } from '../../stores/clusterStore'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { Icon } from '../ui/Icon'
import { ChromeActions } from '../Layout/ChromeActions'
import { ClusterAvatar } from './ClusterAvatar'

const DRAG_THRESHOLD_PX = 5

/** Browser-style cluster tabs — closable, reorderable from anywhere on the tab. */
export function ClusterHeaderTabs(): React.JSX.Element | null {
  const { t } = useTranslation()
  const clusters = useClusterStore((s) => s.clusters)
  const openedTabs = useClusterStore((s) => s.openedTabs)
  const activeClusterId = useClusterStore((s) => s.activeClusterId)
  const splitView = useClusterStore((s) => s.splitView)
  const splitLeftClusterId = useClusterStore((s) => s.splitLeftClusterId)
  const splitRightClusterId = useClusterStore((s) => s.splitRightClusterId)
  const focusedSplitPane = useClusterStore((s) => s.focusedSplitPane)
  const setActiveCluster = useClusterStore((s) => s.setActiveCluster)
  const closeClusterTab = useClusterStore((s) => s.closeClusterTab)
  const reorderOpenedTabs = useClusterStore((s) => s.reorderOpenedTabs)
  const showClusterTabLogos = useDisplaySettingsStore((s) => s.showClusterTabLogos)
  const listRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const pendingRef = useRef<{ id: string; x: number; y: number } | null>(null)
  const lastOverIdRef = useRef<string | null>(null)
  const didDragRef = useRef(false)

  const openClusters = openedTabs
    .map((id) => clusters.find((c) => c.id === id))
    .filter((c): c is ClusterEntry => !!c)

  useEffect(() => {
    if (!activeClusterId || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-cluster-id="${activeClusterId}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeClusterId])

  useEffect(() => {
    function clearDrag(): void {
      pendingRef.current = null
      lastOverIdRef.current = null
      setDraggingId(null)
      document.body.classList.remove('ml-browser-tab-dragging')
    }

    function onPointerMove(e: PointerEvent): void {
      const pending = pendingRef.current
      if (!pending) return

      const dx = e.clientX - pending.x
      const dy = e.clientY - pending.y
      if (!didDragRef.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
        didDragRef.current = true
        setDraggingId(pending.id)
        document.body.classList.add('ml-browser-tab-dragging')
      }

      const under = document.elementFromPoint(e.clientX, e.clientY)
      const tab = under?.closest<HTMLElement>('[data-cluster-id]')
      const overId = tab?.dataset.clusterId
      if (!overId || overId === pending.id) return
      if (lastOverIdRef.current === overId) return
      lastOverIdRef.current = overId
      reorderOpenedTabs(pending.id, overId)
    }

    function onPointerUp(): void {
      if (!pendingRef.current) return
      clearDrag()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      document.body.classList.remove('ml-browser-tab-dragging')
    }
  }, [reorderOpenedTabs])

  if (openClusters.length === 0) return null

  function handleClose(e: React.MouseEvent, id: string): void {
    e.stopPropagation()
    e.preventDefault()
    closeClusterTab(id)
  }

  function handleAuxClick(e: React.MouseEvent, id: string): void {
    if (e.button === 1) {
      e.preventDefault()
      closeClusterTab(id)
    }
  }

  function onTabPointerDown(e: React.PointerEvent, id: string): void {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.ml-browser-tab__close')) return
    didDragRef.current = false
    lastOverIdRef.current = null
    pendingRef.current = { id, x: e.clientX, y: e.clientY }
  }

  function onTabClick(id: string): void {
    if (didDragRef.current) {
      didDragRef.current = false
      return
    }
    setActiveCluster(id)
  }

  return (
    <div className="ml-browser-tabs titlebar-no-drag">
      <div ref={listRef} className="ml-browser-tabs__list" role="tablist" aria-label="Cluster tabs">
        {openClusters.map((cluster) => {
          const inLeft = splitView && cluster.id === splitLeftClusterId
          const inRight = splitView && cluster.id === splitRightClusterId
          const active = splitView
            ? (focusedSplitPane === 'left' && inLeft) || (focusedSplitPane === 'right' && inRight)
            : cluster.id === activeClusterId
          const tip = cluster.customName
          return (
            <Tooltip key={cluster.id} title={tip} mouseEnterDelay={0.35} placement="bottom">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={cluster.customName}
                data-cluster-id={cluster.id}
                className={`ml-browser-tab${active ? ' is-active' : ''}${
                  inLeft ? ' is-split-left' : ''
                }${inRight ? ' is-split-right' : ''}${
                  draggingId === cluster.id ? ' is-dragging' : ''
                }`}
                style={{
                  width: 'var(--ml-cluster-tab-width, 220px)',
                  minWidth: 'var(--ml-cluster-tab-width, 220px)',
                  maxWidth: 'var(--ml-cluster-tab-width, 220px)',
                  flex: '0 0 var(--ml-cluster-tab-width, 220px)'
                }}
                onClick={() => onTabClick(cluster.id)}
                onAuxClick={(e) => handleAuxClick(e, cluster.id)}
                onPointerDown={(e) => onTabPointerDown(e, cluster.id)}
              >
                <span
                  className={`ml-browser-tab__status ml-browser-tab__status--${cluster.status}`}
                  aria-hidden
                />
                {showClusterTabLogos ? (
                  <span className="ml-browser-tab__logo">
                    <ClusterAvatar
                      logoUrl={cluster.logoUrl}
                      name={cluster.customName}
                      contextName={cluster.contextName}
                      endpoint={cluster.endpoint}
                      size={18}
                    />
                  </span>
                ) : null}
                <span className="ml-browser-tab__label">{cluster.customName}</span>
                <span
                  className="ml-browser-tab__close"
                  aria-label={t('common.close')}
                  onClick={(e) => handleClose(e, cluster.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Icon icon={X} variant="micro" />
                </span>
              </button>
            </Tooltip>
          )
        })}
      </div>

      <div className="ml-browser-tabs__actions">
        <ChromeActions showSplit strip />
      </div>
    </div>
  )
}
