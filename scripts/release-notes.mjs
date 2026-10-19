#!/usr/bin/env node
/**
 * Prints the release notes for a version as Markdown, taken from src/shared/whatsNew.ts — the same
 * curated notes the app shows after an update. Commit subjects are deliberately not used: the public
 * releases repository should not expose the source repository's history.
 *
 *   node scripts/release-notes.mjs 0.1.33
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))
const ts = require('typescript')

const version = (process.argv[2] ?? '').replace(/^v/, '')
if (!version) {
  console.error('usage: release-notes.mjs <version>')
  process.exit(1)
}

const source = readFileSync(join(root, 'src/shared/whatsNew.ts'), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
const mod = { exports: {} }
vm.runInNewContext(outputText, { module: mod, exports: mod.exports })
const entry = mod.exports.WHATS_NEW?.[version]

const lines = []
if (entry) {
  lines.push(`## ${entry.title}`, '')
  for (const item of entry.items) lines.push(`- ${item}`)
} else {
  lines.push('Maintenance release with fixes and under-the-hood improvements.')
}
lines.push('', '---', '', 'macOS: pick the **arm64** installer for Apple Silicon, the plain `.dmg` for Intel. Installed apps update themselves.')
console.log(lines.join('\n'))
