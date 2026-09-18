import type { VisualizerEdge, VisualizerNode } from '@shared/types/visualizer'

export const VIZ_SVC_W = 210
export const VIZ_SVC_H = 98
export const VIZ_WL_W = 158
export const VIZ_WL_H = 196
export const VIZ_NODE_GAP = 14
export const VIZ_STACK_GAP = 52
export const VIZ_INST_PAD = 18
export const VIZ_INST_HEADER = 30
export const VIZ_NS_PAD = 22
export const VIZ_NS_HEADER = 34
export const VIZ_INST_GAP = 22
export const VIZ_NS_GAP_X = 36
export const VIZ_NS_GAP_Y = 36
export const VIZ_ROW_MAX = 1680

export type VizFrameVariant = 'namespace' | 'instance'

export interface VizLaidNode {
  id: string
  type: 'vizFrame' | 'vizService' | 'vizWorkload'
  position: { x: number; y: number }
  parentId?: string
  width: number
  height: number
  data: {
    variant?: VizFrameVariant
    label?: string
    node?: VisualizerNode
  }
}

export interface VizLaidEdge {
  id: string
  source: string
  target: string
}

function rowWidth(count: number, item: number, gap: number): number {
  if (count <= 0) return 0
  return count * item + (count - 1) * gap
}

export function layoutVisualizer(
  nodes: VisualizerNode[],
  edges: VisualizerEdge[]
): { nodes: VizLaidNode[]; edges: VizLaidEdge[] } {
  const byNs = new Map<string, Map<string, VisualizerNode[]>>()
  for (const node of nodes) {
    const instMap = byNs.get(node.namespace) ?? new Map<string, VisualizerNode[]>()
    const list = instMap.get(node.instance) ?? []
    list.push(node)
    instMap.set(node.instance, list)
    byNs.set(node.namespace, instMap)
  }

  const laid: VizLaidNode[] = []
  const nsBoxes: Array<{ id: string; w: number; h: number }> = []

  const nsNames = [...byNs.keys()].sort((a, b) => a.localeCompare(b))
  for (const ns of nsNames) {
    const instMap = byNs.get(ns)!
    const instNames = [...instMap.keys()].sort((a, b) => {
      if (a === 'default') return -1
      if (b === 'default') return 1
      return a.localeCompare(b)
    })

    const instBoxes: Array<{ id: string; x: number; y: number; w: number; h: number }> = []
    let cursorX = VIZ_NS_PAD
    let cursorY = VIZ_NS_HEADER
    let rowH = 0
    let maxInner = VIZ_NS_PAD

    for (const inst of instNames) {
      const members = instMap.get(inst)!
      const services = members.filter((n) => n.kind === 'Service')
      const workloads = members.filter((n) => n.kind !== 'Service')
      if (services.length === 0 && workloads.length === 0) continue

      const svcRow = rowWidth(services.length, VIZ_SVC_W, VIZ_NODE_GAP)
      const wlRow = rowWidth(workloads.length, VIZ_WL_W, VIZ_NODE_GAP)
      const inner = Math.max(svcRow, wlRow, 96)
      const width = inner + VIZ_INST_PAD * 2
      const hasSvc = services.length > 0
      const hasWl = workloads.length > 0
      const height =
        VIZ_INST_HEADER +
        (hasSvc ? VIZ_SVC_H : 0) +
        (hasSvc && hasWl ? VIZ_STACK_GAP : 0) +
        (hasWl ? VIZ_WL_H : 0) +
        VIZ_INST_PAD

      if (cursorX > VIZ_NS_PAD && cursorX + width > VIZ_ROW_MAX) {
        cursorX = VIZ_NS_PAD
        cursorY += rowH + VIZ_INST_GAP
        rowH = 0
      }

      const instId = `inst:${ns}/${inst}`
      instBoxes.push({ id: instId, x: cursorX, y: cursorY, w: width, h: height })
      cursorX += width + VIZ_INST_GAP
      rowH = Math.max(rowH, height)
      maxInner = Math.max(maxInner, cursorX - VIZ_INST_GAP)

      let sx = VIZ_INST_PAD
      const sy = VIZ_INST_HEADER
      for (const svc of services) {
        laid.push({
          id: svc.id,
          type: 'vizService',
          parentId: instId,
          position: { x: sx, y: sy },
          width: VIZ_SVC_W,
          height: VIZ_SVC_H,
          data: { node: svc }
        })
        sx += VIZ_SVC_W + VIZ_NODE_GAP
      }

      let wx = VIZ_INST_PAD
      const wy = VIZ_INST_HEADER + (hasSvc ? VIZ_SVC_H + VIZ_STACK_GAP : 0)
      for (const wl of workloads) {
        laid.push({
          id: wl.id,
          type: 'vizWorkload',
          parentId: instId,
          position: { x: wx, y: wy },
          width: VIZ_WL_W,
          height: VIZ_WL_H,
          data: { node: wl }
        })
        wx += VIZ_WL_W + VIZ_NODE_GAP
      }
    }

    const nsWidth = Math.max(maxInner + VIZ_NS_PAD, 180)
    const nsHeight = cursorY + rowH + VIZ_NS_PAD
    const nsId = `ns:${ns}`
    nsBoxes.push({ id: nsId, w: nsWidth, h: nsHeight })

    laid.unshift({
      id: nsId,
      type: 'vizFrame',
      position: { x: 0, y: 0 },
      width: nsWidth,
      height: nsHeight,
      data: { variant: 'namespace', label: ns }
    })

    for (const inst of instBoxes) {
      const label = inst.id.slice(`inst:${ns}/`.length)
      laid.splice(1, 0, {
        id: inst.id,
        type: 'vizFrame',
        parentId: nsId,
        position: { x: inst.x, y: inst.y },
        width: inst.w,
        height: inst.h,
        data: { variant: 'instance', label }
      })
    }
  }

  let packX = 40
  let packY = 40
  let packRowH = 0
  for (const box of nsBoxes) {
    if (packX > 40 && packX + box.w > VIZ_ROW_MAX) {
      packX = 40
      packY += packRowH + VIZ_NS_GAP_Y
      packRowH = 0
    }
    const node = laid.find((n) => n.id === box.id)
    if (node) node.position = { x: packX, y: packY }
    packX += box.w + VIZ_NS_GAP_X
    packRowH = Math.max(packRowH, box.h)
  }

  const ids = new Set(laid.map((n) => n.id))
  const laidEdges: VizLaidEdge[] = edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({ id: e.id, source: e.source, target: e.target }))

  return { nodes: laid, edges: laidEdges }
}
