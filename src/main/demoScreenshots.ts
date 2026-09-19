import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BrowserWindow } from 'electron'

const SHOTS: Array<{ file: string; target: string; waitMs: number }> = [
  { file: 'magiclens-nodes.png', target: 'Nodes', waitMs: 1800 },
  { file: 'magiclens-deployments.png', target: 'Deployments', waitMs: 1800 },
  { file: 'magiclens-logs.png', target: 'Pods', waitMs: 1600 },
  { file: 'magiclens-storage.png', target: 'storageOverview', waitMs: 1800 },
  { file: 'magiclens-topology.png', target: 'topology', waitMs: 2200 },
  { file: 'magiclens-visualizer.png', target: 'visualizer', waitMs: 2400 },
  { file: 'magiclens-helm.png', target: 'helmCharts', waitMs: 1800 },
  { file: 'magiclens-timeline.png', target: 'eventTimeline', waitMs: 1800 }
]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function scheduleDemoScreenshots(window: BrowserWindow): void {
  if (process.env.MAGICLENS_SCREENSHOTS !== '1') return
  const dest = join(process.cwd(), 'docs/screenshots')
  window.webContents.once('did-finish-load', () => {
    void (async () => {
      await mkdir(dest, { recursive: true })
      window.setSize(1440, 900)
      window.center()
      await sleep(7000)
      for (const shot of SHOTS) {
        await window.webContents.executeJavaScript(`window.__mlDemoShot(${JSON.stringify(shot.target)})`)
        await sleep(shot.waitMs)
        const image = await window.webContents.capturePage()
        await writeFile(join(dest, shot.file), image.toPNG())
        console.log(`[demo-screenshots] wrote ${shot.file}`)
      }
      console.log(`[demo-screenshots] done → ${dest}`)
    })().catch((err) => {
      console.error('[demo-screenshots] failed', err)
    })
  })
}
