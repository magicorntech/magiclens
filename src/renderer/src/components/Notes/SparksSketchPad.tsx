import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Tooltip, message } from 'antd'
import {
  ArrowUpRight,
  Circle,
  Eraser,
  FileUp,
  Highlighter,
  ImagePlus,
  Minus,
  MousePointer2,
  Pencil,
  RotateCcw,
  Square,
  Trash2,
  Video
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  SparksSketchDoc,
  SparksSketchDrawTool,
  SparksSketchItem,
  SparksSketchMedia,
  SparksSketchShape,
  SparksSketchShapeKind,
  SparksSketchStroke
} from '@shared/types/sparks'
import { Icon } from '../ui/Icon'
import { mediaDisplayUrl } from './sparksMedia'

type Tool =
  | SparksSketchDrawTool
  | SparksSketchShapeKind
  | 'select'

const COLORS = ['#1f2937', '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#7c3aed', '#ffffff']

interface SparksSketchPadProps {
  noteId: string
  active: boolean
  vaultPath?: string | null
  onInsertMarkdown: (snippet: string) => void
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function mediaSrc(path: string): string {
  return mediaDisplayUrl(path)
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: SparksSketchStroke,
  w: number,
  h: number
): void {
  if (stroke.points.length < 2) return
  ctx.save()
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
  } else if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply'
    ctx.strokeStyle = stroke.color
    ctx.globalAlpha = 0.35
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = stroke.color
    ctx.globalAlpha = 1
  }
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(stroke.points[0]!.x * w, stroke.points[0]!.y * h)
  for (let i = 1; i < stroke.points.length; i++) {
    const p = stroke.points[i]!
    ctx.lineTo(p.x * w, p.y * h)
  }
  ctx.stroke()
  ctx.restore()
}

function drawShape(ctx: CanvasRenderingContext2D, shape: SparksSketchShape, w: number, h: number): void {
  const x1 = shape.x1 * w
  const y1 = shape.y1 * h
  const x2 = shape.x2 * w
  const y2 = shape.y2 * h
  ctx.save()
  ctx.strokeStyle = shape.color
  ctx.lineWidth = shape.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (shape.shape === 'rect') {
    ctx.strokeRect(
      Math.min(x1, x2),
      Math.min(y1, y2),
      Math.abs(x2 - x1),
      Math.abs(y2 - y1)
    )
  } else if (shape.shape === 'ellipse') {
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    const rx = Math.abs(x2 - x1) / 2
    const ry = Math.abs(y2 - y1) / 2
    ctx.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (shape.shape === 'line' || shape.shape === 'arrow') {
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    if (shape.shape === 'arrow') {
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const head = 10 + shape.width
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6))
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6))
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawMediaBadge(
  ctx: CanvasRenderingContext2D,
  media: SparksSketchMedia,
  w: number,
  h: number
): void {
  const x = media.x * w
  const y = media.y * h
  const bw = Math.max(media.w * w, 72)
  const bh = Math.max(media.h * h, 40)
  ctx.save()
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)'
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, bw, bh, 8)
  } else {
    ctx.rect(x, y, bw, bh)
  }
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif'
  const label =
    media.media === 'image' ? '🖼' : media.media === 'video' ? '🎬' : '📎'
  ctx.fillText(`${label} ${media.name.slice(0, 28)}`, x + 10, y + 24)
  ctx.restore()
}

export function SparksSketchPad({
  noteId,
  active,
  onInsertMarkdown
}: SparksSketchPadProps): React.JSX.Element {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const itemsRef = useRef<SparksSketchItem[]>([])
  const draftRef = useRef<SparksSketchItem | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0]!)
  const [width, setWidth] = useState(2.5)
  const [ready, setReady] = useState(false)
  const [itemCount, setItemCount] = useState(0)
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (!active) {
      setPortalHost(null)
      return
    }
    setPortalHost(document.getElementById('ml-sparks-tooltabs-extra'))
  }, [active, noteId])

  const size = useCallback((): { w: number; h: number } => {
    const wrap = wrapRef.current
    if (!wrap) return { w: 1, h: 1 }
    const rect = wrap.getBoundingClientRect()
    return { w: Math.max(1, rect.width), h: Math.max(1, rect.height) }
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const dpr = window.devicePixelRatio || 1
    const { w, h } = size()
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const paint = (item: SparksSketchItem): void => {
      if (item.kind === 'stroke') drawStroke(ctx, item, w, h)
      else if (item.kind === 'shape') drawShape(ctx, item, w, h)
      else if (item.kind === 'media') {
        if (item.media === 'image') {
          const abs = mediaSrc(item.path)
          if (abs) {
            let img = imageCache.current.get(abs)
            if (!img) {
              img = new Image()
              img.onload = () => redraw()
              img.src = abs
              imageCache.current.set(abs, img)
            }
            if (img.complete && img.naturalWidth) {
              ctx.drawImage(img, item.x * w, item.y * h, Math.max(item.w * w, 40), Math.max(item.h * h, 40))
              return
            }
          }
        }
        drawMediaBadge(ctx, item, w, h)
      }
    }

    for (const item of itemsRef.current) paint(item)
    if (draftRef.current) paint(draftRef.current)
  }, [size])

  const persist = useCallback(
    (items: SparksSketchItem[]) => {
      itemsRef.current = items
      setItemCount(items.length)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const doc: SparksSketchDoc = {
          version: 2,
          noteId,
          updatedAt: new Date().toISOString(),
          items
        }
        void window.api?.notes?.sketchSave?.(doc)
      }, 350)
    },
    [noteId]
  )

  useEffect(() => {
    let cancelled = false
    setReady(false)
    itemsRef.current = []
    draftRef.current = null
    void (async () => {
      try {
        const doc = await window.api?.notes?.sketchGet?.(noteId)
        if (cancelled) return
        itemsRef.current = doc?.items ?? []
        setItemCount(itemsRef.current.length)
        setReady(true)
        requestAnimationFrame(redraw)
      } catch {
        if (!cancelled) {
          setReady(true)
          requestAnimationFrame(redraw)
        }
      }
    })()
    return () => {
      cancelled = true
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [noteId, redraw])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => redraw())
    ro.observe(wrap)
    redraw()
    return () => ro.disconnect()
  }, [redraw, ready, active])

  function norm(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const { w, h } = size()
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / w)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / h))
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (!active || tool === 'select') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = norm(e)
    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      draftRef.current = {
        id: uid('s'),
        kind: 'stroke',
        color,
        width:
          tool === 'highlighter' ? Math.max(width * 4, 10) : tool === 'eraser' ? Math.max(width * 6, 14) : width,
        tool,
        points: [p]
      } satisfies SparksSketchStroke
    } else {
      draftRef.current = {
        id: uid('sh'),
        kind: 'shape',
        shape: tool,
        color,
        width,
        x1: p.x,
        y1: p.y,
        x2: p.x,
        y2: p.y
      } satisfies SparksSketchShape
    }
    redraw()
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (!draftRef.current) return
    const p = norm(e)
    if (draftRef.current.kind === 'stroke') {
      draftRef.current.points.push(p)
    } else if (draftRef.current.kind === 'shape') {
      draftRef.current.x2 = p.x
      draftRef.current.y2 = p.y
    }
    redraw()
  }

  function onPointerUp(): void {
    if (!draftRef.current) return
    const next = [...itemsRef.current, draftRef.current]
    draftRef.current = null
    persist(next)
    redraw()
  }

  function undo(): void {
    persist(itemsRef.current.slice(0, -1))
    redraw()
  }

  function clearAll(): void {
    persist([])
    redraw()
    message.success(t('notes.sketch.cleared'))
  }

  async function importMedia(kind: 'image' | 'video' | 'file'): Promise<void> {
    const res = await window.api?.notes?.mediaImport?.(noteId, kind)
    if (!res || res.canceled) return
    if (!res.ok || !res.path || !res.name) {
      message.error(res?.error || t('notes.sketch.mediaFailed'))
      return
    }
    const src = mediaDisplayUrl(res.path, res.src)

    if (kind === 'image' || res.media === 'image') {
      onInsertMarkdown(`\n![${res.name}](${src})\n`)
      const media: SparksSketchMedia = {
        id: uid('m'),
        kind: 'media',
        media: 'image',
        path: res.path,
        name: res.name,
        x: 0.12,
        y: 0.18,
        w: 0.42,
        h: 0.28
      }
      persist([...itemsRef.current, media])
      redraw()
      message.success(t('notes.sketch.mediaAdded'))
      return
    }

    if (kind === 'video' || res.media === 'video') {
      onInsertMarkdown(
        `\n<video controls src="${src}" style="max-width:100%;border-radius:0"></video>\n\n[${res.name}](${src})\n`
      )
      const media: SparksSketchMedia = {
        id: uid('m'),
        kind: 'media',
        media: 'video',
        path: res.path,
        name: res.name,
        x: 0.14,
        y: 0.22,
        w: 0.4,
        h: 0.12
      }
      persist([...itemsRef.current, media])
      redraw()
      message.success(t('notes.sketch.mediaAdded'))
      return
    }

    onInsertMarkdown(`\n📎 [${res.name}](${src})\n`)
    const media: SparksSketchMedia = {
      id: uid('m'),
      kind: 'media',
      media: 'file',
      path: res.path,
      name: res.name,
      x: 0.14,
      y: 0.3,
      w: 0.36,
      h: 0.08
    }
    persist([...itemsRef.current, media])
    redraw()
    message.success(t('notes.sketch.mediaAdded'))
  }

  const toolbar = active ? (
    <div className="ml-sparks-tooltabs ml-sparks-tooltabs--tools" role="toolbar" aria-label={t('notes.sketch.toolbar')}>
      <div className="ml-sparks-tooltabs__group">
        {(
          [
            ['select', MousePointer2, 'select'],
            ['pen', Pencil, 'pen'],
            ['highlighter', Highlighter, 'highlighter'],
            ['eraser', Eraser, 'eraser']
          ] as const
        ).map(([id, icon, tip]) => (
          <button
            key={id}
            type="button"
            className={`ml-sparks-tooltabs__tab${tool === id ? ' is-active' : ''}`}
            title={t(`notes.sketch.${tip}`)}
            onClick={() => setTool(id)}
          >
            <Icon icon={icon} variant="micro" />
            <span>{t(`notes.sketch.${tip}`)}</span>
          </button>
        ))}
      </div>
      <span className="ml-sparks-tooltabs__sep" />
      <div className="ml-sparks-tooltabs__group">
        {(
          [
            ['rect', Square, 'rect'],
            ['ellipse', Circle, 'ellipse'],
            ['line', Minus, 'line'],
            ['arrow', ArrowUpRight, 'arrow']
          ] as const
        ).map(([id, icon, tip]) => (
          <button
            key={id}
            type="button"
            className={`ml-sparks-tooltabs__tab${tool === id ? ' is-active' : ''}`}
            title={t(`notes.sketch.${tip}`)}
            onClick={() => setTool(id)}
          >
            <Icon icon={icon} variant="micro" />
            <span>{t(`notes.sketch.${tip}`)}</span>
          </button>
        ))}
      </div>
      <span className="ml-sparks-tooltabs__sep" />
      <div className="ml-sparks-tooltabs__group">
        <Tooltip title={t('notes.sketch.image')}>
          <button
            type="button"
            className="ml-sparks-tooltabs__tab"
            aria-label={t('notes.sketch.image')}
            onClick={() => void importMedia('image')}
          >
            <Icon icon={ImagePlus} variant="micro" />
          </button>
        </Tooltip>
        <Tooltip title={t('notes.sketch.video')}>
          <button
            type="button"
            className="ml-sparks-tooltabs__tab"
            aria-label={t('notes.sketch.video')}
            onClick={() => void importMedia('video')}
          >
            <Icon icon={Video} variant="micro" />
          </button>
        </Tooltip>
        <Tooltip title={t('notes.sketch.file')}>
          <button
            type="button"
            className="ml-sparks-tooltabs__tab"
            aria-label={t('notes.sketch.file')}
            onClick={() => void importMedia('file')}
          >
            <Icon icon={FileUp} variant="micro" />
          </button>
        </Tooltip>
      </div>
      <span className="ml-sparks-tooltabs__sep" />
      <div className="ml-sparks-sketch__colors">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`ml-sparks-sketch__swatch${color === c ? ' is-active' : ''}`}
            style={{ background: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px rgba(0,0,0,.25)' : undefined }}
            aria-label={c}
            onClick={() => {
              setColor(c)
              if (tool === 'select' || tool === 'eraser') setTool('pen')
            }}
          />
        ))}
      </div>
      <label className="ml-sparks-sketch__size">
        <span>{t('notes.sketch.size')}</span>
        <input
          type="range"
          min={1}
          max={14}
          step={0.5}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        />
      </label>
      <span className="ml-sparks-tooltabs__spacer" />
      <Tooltip title={t('notes.sketch.undo')}>
        <Button size="small" icon={<Icon icon={RotateCcw} variant="action" />} onClick={undo} />
      </Tooltip>
      <Tooltip title={t('notes.sketch.clear')}>
        <Button size="small" danger icon={<Icon icon={Trash2} variant="action" />} onClick={clearAll} />
      </Tooltip>
    </div>
  ) : null

  const host = portalHost

  return (
    <div
      className={`ml-sparks-overlay${active ? ' is-active' : ''}${itemCount > 0 || active ? ' is-visible' : ''}`}
      ref={wrapRef}
    >
      {host && toolbar ? createPortal(toolbar, host) : null}

      <canvas
        ref={canvasRef}
        className={`ml-sparks-overlay__canvas${active && tool !== 'select' ? ' is-drawing' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {active && !ready ? <div className="ml-sparks-sketch__loading">{t('notes.sketch.loading')}</div> : null}
    </div>
  )
}
