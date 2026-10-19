#!/usr/bin/env node
/**
 * Prepares the demo stand-ins for the Argo CD / Grafana / Prometheus web UIs.
 *
 * Put full screenshots of the three tools (taken inside MagicLens, so they include its own toolbar) in
 * src/renderer/src/assets/demo/ as:
 *   grafana-login.png  grafana-dashboard.png  argocd-login.png  prometheus.png
 * then run:
 *   MAGICLENS_TOOLS=<dir with node_modules/sharp> node scripts/prepare-demo-webapp-images.mjs
 *
 * Each input is cropped to the web page itself (MagicLens draws its own toolbar around it in the app) and
 * written next to it as <name>.page.png. Real host names / IPs in the Grafana dashboard are painted over
 * with demo values so nothing from a real environment ends up on the website.
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const require = createRequire(join(process.env.MAGICLENS_TOOLS || process.cwd(), 'noop.js'))
const sharp = require('sharp')

const dir = resolve(process.argv[2] || 'src/renderer/src/assets/demo')

// Pixels (at the screenshot's own resolution) taken up by MagicLens chrome above the web page.
const TOP = { 'grafana-login': 47, 'grafana-dashboard': 47, 'argocd-login': 98, prometheus: 94 }

// Text to replace in the dashboard, in the *original* screenshot's coordinates.
const MASKS = {
  'grafana-dashboard': [
    { x: 648, y: 172, w: 460, h: 38, text: 'aurora-pool-a-1' },
    { x: 1222, y: 172, w: 176, h: 38, text: '10.0.12.40:9100' }
  ]
}

for (const [name, top] of Object.entries(TOP)) {
  const src = join(dir, `${name}.png`)
  if (!existsSync(src)) {
    console.warn(`skip ${name}: ${src} not found`)
    continue
  }
  const meta = await sharp(src).metadata()
  const width = meta.width
  const height = meta.height - top
  let image = sharp(src).extract({ left: 0, top, width, height })
  const composites = []
  for (const m of MASKS[name] ?? []) {
    // Sample the box background just left of the text so the patch blends in.
    const px = await sharp(src)
      .extract({ left: m.x - 4, top: m.y + 2, width: 1, height: 1 })
      .raw()
      .toBuffer()
    const fill = `rgb(${px[0]},${px[1]},${px[2]})`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${m.w}" height="${m.h}">
      <rect width="100%" height="100%" fill="${fill}"/>
      <text x="8" y="${m.h - 12}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="22" fill="#ccccdc">${m.text}</text>
    </svg>`
    composites.push({ input: Buffer.from(svg), left: m.x, top: m.y - top })
  }
  if (composites.length) image = sharp(await image.toBuffer()).composite(composites)
  await image.png().toFile(join(dir, `${name}.page.png`))
  console.log(`${name}.page.png ${width}x${height}`)
}
