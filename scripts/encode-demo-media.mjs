#!/usr/bin/env node
/**
 * Turns the raw demo captures (see src/main/demoScreenshots.ts) into web-ready media.
 *
 *   node scripts/encode-demo-media.mjs <capture-dir> <out-dir>
 *
 * Needs `ffmpeg-static` and `sharp`. Set MAGICLENS_TOOLS to a directory whose node_modules has them
 * when they are not installed in this repo.
 *
 * png/<name>.png      -> <out>/shots/<name>.avif (3840w, q60) + <name>.webp (3840w) + <name>-1920.avif
 * video/<scene>.mov   -> <out>/video/<scene>.av1.mp4   (4K, AV1)
 *                        <out>/video/<scene>.h264.mp4  (1080p, H.264 fallback)
 *                        <out>/video/<scene>.gif       (960w preview)
 *                        <out>/video/<scene>-poster.avif
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, parse, resolve } from 'node:path'

const [capDir, outDir] = process.argv.slice(2).map((p) => (p ? resolve(p) : p))
if (!capDir || !outDir) {
  console.error('usage: encode-demo-media.mjs <capture-dir> <out-dir>')
  process.exit(1)
}

const require = createRequire(join(process.env.MAGICLENS_TOOLS || process.cwd(), 'noop.js'))
const ffmpeg = process.env.MAGICLENS_FFMPEG || require('ffmpeg-static')
const sharp = require('sharp')

const mb = (file) => (statSync(file).size / 1024 / 1024).toFixed(1) + ' MB'
const run = (args) => {
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`)
}

const shots = join(outDir, 'shots')
const video = join(outDir, 'video')
mkdirSync(shots, { recursive: true })
mkdirSync(video, { recursive: true })

const only = process.env.MAGICLENS_ENCODE // 'stills' | 'video' | unset (both)
const pngDir = join(capDir, 'png')
if (only !== 'video' && existsSync(pngDir)) {
  for (const file of readdirSync(pngDir).filter((f) => f.endsWith('.png'))) {
    const name = parse(file).name
    const src = join(pngDir, file)
    await sharp(src).avif({ quality: 72, effort: 6, chromaSubsampling: '4:4:4' }).toFile(join(shots, `${name}.avif`))
    await sharp(src).resize(1920).webp({ quality: 90, effort: 5, smartSubsample: true }).toFile(join(shots, `${name}-1920.webp`))
    await sharp(src).resize(1920).avif({ quality: 68, effort: 6, chromaSubsampling: '4:4:4' }).toFile(join(shots, `${name}-1920.avif`))
    console.log(`still ${name}: ${mb(join(shots, `${name}.avif`))} avif`)
  }
}

const movDir = join(capDir, 'video')
if (only !== 'stills' && existsSync(movDir)) {
  const onlyVideo = process.env.MAGICLENS_VIDEO
  for (const file of readdirSync(movDir).filter((f) => f.endsWith('.mov') && (!onlyVideo || parse(f).name === onlyVideo))) {
    const name = parse(file).name
    const src = join(movDir, file)
    run(['-i', src, '-vf', 'scale=2560:-2:flags=lanczos', '-c:v', 'libsvtav1', '-preset', '10', '-crf', '25', '-pix_fmt', 'yuv420p10le', '-g', '120', '-an', '-movflags', '+faststart', join(video, `${name}.av1.mp4`)])
    run(['-i', src, '-vf', 'scale=2560:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', join(video, `${name}.h264.mp4`)])
    if (process.env.MAGICLENS_GIF === '1') run(['-i', src, '-vf', 'fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', join(video, `${name}.gif`)])
    run(['-ss', '1.5', '-i', src, '-frames:v', '1', join(video, `${name}-poster.png`)])
    await sharp(join(video, `${name}-poster.png`)).avif({ quality: 72, effort: 6, chromaSubsampling: '4:4:4' }).toFile(join(video, `${name}-poster.avif`))
    console.log(`scene ${name}: av1 ${mb(join(video, `${name}.av1.mp4`))}, h264 ${mb(join(video, `${name}.h264.mp4`))}, h264/av1 done`)
  }
}
