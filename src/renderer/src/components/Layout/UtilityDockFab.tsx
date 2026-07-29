import { useEffect, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { FilePlus2, Plus, Sparkles, Terminal, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UtilityFabOffset } from '@shared/types/app'
import { normalizeUtilityFabSide } from '@shared/types/app'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useNotesStore } from '../../stores/notesStore'
import { Icon } from '../ui/Icon'
import { useBottomPanel } from './BottomPanelContext'

interface UtilityDockFabProps {
  clusterId: string
  namespace: string
}

type FabDock = 'left-middle' | 'right-middle' | 'left-bottom' | 'right-bottom'

function tipPlacement(dock: FabDock, offset: UtilityFabOffset | null): 'left' | 'right' | 'top' {
  if (offset) {
    if (offset.yPct > 78) return 'top'
    return offset.xPct >= 50 ? 'left' : 'right'
  }
  if (dock === 'left-middle' || dock === 'left-bottom') return 'right'
  return 'left'
}

function fanClass(dock: FabDock): 'left' | 'right' | 'bottom-left' | 'bottom-right' {
  if (dock === 'left-middle') return 'left'
  if (dock === 'right-middle') return 'right'
  if (dock === 'left-bottom') return 'bottom-left'
  return 'bottom-right'
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

const CLOSE_DELAY_MS = 260
const LONG_PRESS_MS = 420
const MOVE_CANCEL_PX = 8

/** Edge balloon: hover opens a round radial menu; long-press + drag to park. */
export function UtilityDockFab({ clusterId, namespace }: UtilityDockFabProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const show = useDisplaySettingsStore((s) => s.showUtilityFab)
  const side = useDisplaySettingsStore((s) => s.utilityFabSide)
  const offset = useDisplaySettingsStore((s) => s.utilityFabOffset)
  const setUtilityFabOffset = useDisplaySettingsStore((s) => s.setUtilityFabOffset)
  const { addTerminalTab, openYamlEditor } = useBottomPanel()
  const openCreateSpark = useNotesStore((s) => s.openCreate)
  const [expanded, setExpanded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [liveOffset, setLiveOffset] = useState<UtilityFabOffset | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null)
  const dragMovedRef = useRef(false)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current)
      if (longPressTimerRef.current != null) window.clearTimeout(longPressTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (offset == null) setLiveOffset(null)
  }, [offset])

  if (!show) return null

  const dock = normalizeUtilityFabSide(side) as FabDock
  const activeOffset = liveOffset ?? offset
  const free = activeOffset != null
  const tip = tipPlacement(dock, activeOffset)
  const fan = fanClass(dock)
  const ns = namespace === 'ALL' || !namespace ? 'default' : namespace

  function clearCloseTimer(): void {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function clearLongPressTimer(): void {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function openMenu(): void {
    if (dragging) return
    clearCloseTimer()
    setExpanded(true)
  }

  function scheduleClose(): void {
    if (dragging) return
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setExpanded(false)
      closeTimerRef.current = null
    }, CLOSE_DELAY_MS)
  }

  function pctFromPoint(clientX: number, clientY: number): UtilityFabOffset | null {
    const parent = rootRef.current?.offsetParent as HTMLElement | null
    if (!parent) return null
    const rect = parent.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return {
      xPct: clamp(((clientX - rect.left) / rect.width) * 100, 4, 96),
      yPct: clamp(((clientY - rect.top) / rect.height) * 100, 4, 96)
    }
  }

  function beginDrag(clientX: number, clientY: number): void {
    clearLongPressTimer()
    clearCloseTimer()
    setExpanded(false)
    setDragging(true)
    dragMovedRef.current = false
    const next = pctFromPoint(clientX, clientY)
    if (next) setLiveOffset(next)
  }

  function onTogglePointerDown(e: React.PointerEvent): void {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pressOriginRef.current = { x: e.clientX, y: e.clientY }
    dragMovedRef.current = false
    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null
      beginDrag(e.clientX, e.clientY)
    }, LONG_PRESS_MS)
  }

  function onTogglePointerMove(e: React.PointerEvent): void {
    const origin = pressOriginRef.current
    if (!dragging && origin) {
      const dist = Math.hypot(e.clientX - origin.x, e.clientY - origin.y)
      if (dist > MOVE_CANCEL_PX) clearLongPressTimer()
    }
    if (!dragging) return
    dragMovedRef.current = true
    const next = pctFromPoint(e.clientX, e.clientY)
    if (next) setLiveOffset(next)
  }

  function endDrag(e: React.PointerEvent): void {
    clearLongPressTimer()
    pressOriginRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // already released
    }
    if (!dragging) return
    const finalPos = liveOffset ?? pctFromPoint(e.clientX, e.clientY)
    setDragging(false)
    if (finalPos) {
      setLiveOffset(finalPos)
      void setUtilityFabOffset(finalPos)
    }
    if (dragMovedRef.current) {
      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
  }

  function runAction(fn: () => void): void {
    if (suppressClickRef.current || dragging) return
    fn()
    setExpanded(false)
  }

  function openEmptyEditor(): void {
    openYamlEditor({
      title: t('utilityFab.emptyEditor'),
      clusterId,
      mode: 'create',
      namespace: ns,
      initialYaml: '',
      listQueryKey: ['yaml-scratch', clusterId]
    })
  }

  function openSpark(): void {
    openCreateSpark({
      title: '',
      scope: 'cluster',
      clusterId,
      namespace: ns === 'default' ? undefined : ns
    })
  }

  const freeStyle: React.CSSProperties | undefined = free
    ? {
        left: `${activeOffset.xPct}%`,
        top: `${activeOffset.yPct}%`,
        right: 'auto',
        bottom: 'auto',
        transform: 'translate(-50%, -50%)'
      }
    : undefined

  const actions = [
    {
      key: 'terminal',
      label: t('utilityFab.terminal'),
      icon: Terminal,
      onClick: () => runAction(addTerminalTab)
    },
    {
      key: 'editor',
      label: t('utilityFab.emptyEditor'),
      icon: FilePlus2,
      onClick: () => runAction(openEmptyEditor)
    },
    {
      key: 'spark',
      label: t('utilityFab.addSpark'),
      icon: Sparkles,
      onClick: () => runAction(openSpark)
    }
  ] as const

  return (
    <div
      ref={rootRef}
      className={`ml-utility-fab ml-utility-fab--${free ? 'free' : dock} ml-utility-fab-fan--${fan}${expanded ? ' is-expanded' : ''}${dragging ? ' is-dragging' : ''}`}
      style={freeStyle}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      onFocusCapture={openMenu}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null
        if (next && e.currentTarget.contains(next)) return
        scheduleClose()
      }}
    >
      <div className="ml-utility-fab__orbit" aria-hidden={!expanded}>
        {actions.map((action, index) => (
          <span key={action.key} className="ml-utility-fab__slot" data-i={index}>
            <Tooltip title={action.label} placement={tip} mouseEnterDelay={0.3}>
              <button
                type="button"
                className="ml-utility-fab__action"
                style={{ transitionDelay: expanded ? `${40 + index * 45}ms` : '0ms' }}
                aria-label={action.label}
                tabIndex={expanded ? 0 : -1}
                onClick={action.onClick}
              >
                <Icon icon={action.icon} variant="toolbar" />
              </button>
            </Tooltip>
          </span>
        ))}
      </div>

      <button
        type="button"
        className="ml-utility-fab__toggle"
        aria-expanded={expanded}
        aria-label={t('utilityFab.expand')}
        title={t('utilityFab.dragHint')}
        tabIndex={0}
        onPointerDown={onTogglePointerDown}
        onPointerMove={onTogglePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <Icon icon={expanded ? X : Plus} variant="toolbar" />
      </button>
    </div>
  )
}
