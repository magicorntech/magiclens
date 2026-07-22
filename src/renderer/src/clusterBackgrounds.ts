import bg01 from './assets/cluster-backgrounds/bg-01.svg'
import bg02 from './assets/cluster-backgrounds/bg-02.svg'
import bg03 from './assets/cluster-backgrounds/bg-03.svg'
import bg04 from './assets/cluster-backgrounds/bg-04.svg'
import bg05 from './assets/cluster-backgrounds/bg-05.svg'
import bg06 from './assets/cluster-backgrounds/bg-06.svg'
import bg07 from './assets/cluster-backgrounds/bg-07.svg'
import bg08 from './assets/cluster-backgrounds/bg-08.svg'
import bg09 from './assets/cluster-backgrounds/bg-09.svg'
import bg10 from './assets/cluster-backgrounds/bg-10.svg'

export const DEFAULT_CLUSTER_BACKGROUNDS = [
  { id: 'default-01', name: 'Alpine Dawn', src: bg01 },
  { id: 'default-02', name: 'Ocean Horizon', src: bg02 },
  { id: 'default-03', name: 'Forest Mist', src: bg03 },
  { id: 'default-04', name: 'Desert Dusk', src: bg04 },
  { id: 'default-05', name: 'Lavender Fields', src: bg05 },
  { id: 'default-06', name: 'Northern Lights', src: bg06 },
  { id: 'default-07', name: 'Sakura Hills', src: bg07 },
  { id: 'default-08', name: 'Golden Plains', src: bg08 },
  { id: 'default-09', name: 'Storm Coast', src: bg09 },
  { id: 'default-10', name: 'Tropical Bay', src: bg10 }
] as const

export type DefaultBackgroundId = (typeof DEFAULT_CLUSTER_BACKGROUNDS)[number]['id']

export function isDefaultBackgroundId(id: string | undefined | null): id is DefaultBackgroundId {
  return !!id && DEFAULT_CLUSTER_BACKGROUNDS.some((b) => b.id === id)
}

export function resolveClusterBackgroundUrl(opts: {
  backgroundId?: string | null
  backgroundCustomUrl?: string | null
}): string | undefined {
  if (opts.backgroundId === 'custom' && opts.backgroundCustomUrl) {
    return opts.backgroundCustomUrl
  }
  if (opts.backgroundId) {
    const found = DEFAULT_CLUSTER_BACKGROUNDS.find((b) => b.id === opts.backgroundId)
    if (found) return found.src
  }
  return undefined
}

/** Safe CSS `url("...")` value for backgrounds (handles data URLs). */
export function cssBackgroundImage(url: string): string {
  return `url("${url.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`
}

export const DEFAULT_BACKGROUND_PANEL_OPACITY = 70

export function normalizeBackgroundPanelOpacity(value?: number | null): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_BACKGROUND_PANEL_OPACITY
  return Math.min(100, Math.max(15, Math.round(value)))
}

/** Resize/compress an image for cluster wallpaper storage (max ~1920px JPEG). */
export async function compressBackgroundToDataUrl(fileOrDataUrl: File | string): Promise<string> {
  const src =
    typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(fileOrDataUrl)
        })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Failed to load image'))
    el.src = src
  })

  const maxW = 1920
  const maxH = 1080
  const scale = Math.min(1, maxW / img.width, maxH / img.height)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.82)
}
