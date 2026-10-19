import fs from 'node:fs'

const version = (process.argv[2] ?? '').replace(/^v/, '')
if (!version) {
  console.error('usage: node scripts/release-notes.mjs <version>')
  process.exit(1)
}

const src = fs.readFileSync(new URL('../src/shared/whatsNew.ts', import.meta.url), 'utf8')
const marker = `'${version}': {`
const start = src.indexOf(marker)
if (start === -1) process.exit(2)

const after = src.slice(start + marker.length)
const end = after.search(/\n  \},?\n/)
const block = end === -1 ? after : after.slice(0, end)
const title = block.match(/title:\s*'((?:\\'|[^'])*)'/)?.[1]?.replace(/\\'/g, "'") ?? ''
const itemsStart = block.indexOf('items: [')
const itemsBlock = itemsStart === -1 ? '' : block.slice(itemsStart)
const items = []
const itemRe = /'((?:\\'|[^'])*)'/g
for (let match = itemRe.exec(itemsBlock); match; match = itemRe.exec(itemsBlock)) {
  items.push(match[1].replace(/\\'/g, "'"))
}

const lines = ["## What's changed", '']
if (title) lines.push(title, '')
for (const item of items) lines.push(`- ${item}`)
process.stdout.write(`${lines.join('\n')}\n`)
