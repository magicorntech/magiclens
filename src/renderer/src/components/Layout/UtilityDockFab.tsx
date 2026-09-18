import { useEffect, useRef, useState } from 'react'
import { FilePlus2, Plus, Sparkles, Terminal } from 'lucide-react'
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
type MenuAnchor = 'west' | 'east' | 'north-west' | 'north-east' | 'south-west' | 'south-east'

function menuAnchor(dock: FabDock, offset: UtilityFabOffset | null): MenuAnchor {
  if (offset) {
    const east = offset.xPct < 50
    const south = offset.yPct < 28
    const north = offset.yPct > 68
    if (south) return east ? 'south-east' : 'south-west'
    if (north) return east ? 'north-east' : 'north-west'
    return east ? 'east' : 'west'
  }
  if (dock === 'left-middle') return 'east'
  if (dock === 'right-middle') return 'west'
  if (dock === 'left-bottom') return 'north-east'
  return 'north-west'
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

const CLOSE_DELAY_MS = 180
const LONG_PRESS_MS = 420
const MOVE_CANCEL_PX = 8

/** Docked + control: hover opens a labeled action menu; long-press + drag to park. */
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

  useEffect(() => {
    if (!expanded) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  if (!show) return null

  const dock = normalizeUtilityFabSide(side) as FabDock
  const activeOffset = liveOffset ?? offset
  const free = activeOffset != null
  const anchor = menuAnchor(dock, activeOffset)
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
      hint: t('utilityFab.hintTerminal'),
      icon: Terminal,
      onClick: () => runAction(addTerminalTab)
    },
    {
      key: 'editor',
      label: t('utilityFab.emptyEditor'),
      hint: t('utilityFab.hintEditor'),
      icon: FilePlus2,
      onClick: () => runAction(openEmptyEditor)
    },
    {
      key: 'spark',
      label: t('utilityFab.addSpark'),
      hint: t('utilityFab.hintSpark'),
      icon: Sparkles,
      onClick: () => runAction(openSpark)
    }
  ] as const

  return (
    <div
      ref={rootRef}
      className={`ml-utility-fab ml-utility-fab--${free ? 'free' : dock} ml-utility-fab--anchor-${anchor}${expanded ? ' is-expanded' : ''}${dragging ? ' is-dragging' : ''}`}
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
      <div className="ml-utility-fab__menu" role="menu" aria-label={t('utilityFab.expand')} aria-hidden={!expanded}>
        <div className="ml-utility-fab__menu-title">{t('utilityFab.expand')}</div>
        <div className="ml-utility-fab__menu-list">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              className="ml-utility-fab__item"
              tabIndex={expanded ? 0 : -1}
              onClick={action.onClick}
            >
              <span className="ml-utility-fab__item-icon" aria-hidden>
                <Icon icon={action.icon} variant="action" />
              </span>
              <span className="ml-utility-fab__item-copy">
                <span className="ml-utility-fab__item-label">{action.label}</span>
                <span className="ml-utility-fab__item-hint">{action.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="ml-utility-fab__menu-foot">{t('utilityFab.dragHint')}</div>
      </div>

      <button
        type="button"
        className="ml-utility-fab__toggle"
        aria-expanded={expanded}
        aria-haspopup="menu"
        aria-label={t('utilityFab.expand')}
        title={t('utilityFab.dragHint')}
        tabIndex={0}
        onPointerDown={onTogglePointerDown}
        onPointerMove={onTogglePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="ml-utility-fab__plus" aria-hidden>
          <Icon icon={Plus} variant="toolbar" />
        </span>
      </button>
    </div>
  )
}
