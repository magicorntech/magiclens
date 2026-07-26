#!/usr/bin/env node
/**
 * Deep-merge JSON patches from scripts/i18n-patches/{lang}.json into locale TS files.
 * Usage: node scripts/apply-i18n-patches.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const localesDir = path.join(root, 'src/renderer/src/i18n/locales')
const patchesDir = path.join(__dirname, 'i18n-patches')

const LANGS = ['tr', 'de', 'fr', 'ja', 'ko', 'zh']

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch ?? base
  if (!base || typeof base !== 'object' || Array.isArray(base)) return patch
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge(base[key], value)
    } else if (value !== undefined) {
      out[key] = value
    }
  }
  return out
}

function extractObjectLiteral(src) {
  const assign = src.search(/=\s*\{/)
  if (assign < 0) throw new Error('no = {')
  const start = src.indexOf('{', assign)
  let depth = 0
  let inStr = null
  let escape = false
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (escape) {
        escape = false
        continue
      }
      if (c === '\\') {
        escape = true
        continue
      }
      if (c === inStr) inStr = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return { start, end: i + 1, lit: src.slice(start, i + 1) }
    }
  }
  throw new Error('unbalanced')
}

function loadLocaleObject(lang) {
  const raw = fs.readFileSync(path.join(localesDir, `${lang}.ts`), 'utf8')
  const { lit } = extractObjectLiteral(raw)
  return Function(`"use strict"; return (${lit})`)()
}

function quoteKey(key) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
}

function quoteString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function serialize(value, indent = 2) {
  const pad = (n) => ' '.repeat(n)
  if (typeof value === 'string') return quoteString(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const items = value.map((v) => `${pad(indent + 2)}${serialize(v, indent + 2)}`)
    return `[\n${items.join(',\n')}\n${pad(indent)}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) return '{}'
    const lines = entries.map(([k, v]) => {
      const serialized = serialize(v, indent + 2)
      // Prefer multiline for long strings (match existing style loosely)
      if (typeof v === 'string' && v.length > 90) {
        return `${pad(indent + 2)}${quoteKey(k)}:\n${pad(indent + 4)}${serialized}`
      }
      return `${pad(indent + 2)}${quoteKey(k)}: ${serialized}`
    })
    return `{\n${lines.join(',\n')}\n${pad(indent)}}`
  }
  return JSON.stringify(value)
}

function writeLocale(lang, obj) {
  const body = serialize(obj, 0)
  const contents = `import type { TranslationOverrides } from './en'\n\nexport const ${lang}: TranslationOverrides = ${body}\n`
  fs.writeFileSync(path.join(localesDir, `${lang}.ts`), contents)
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out[key] = v
  }
  return out
}

function loadEnFlat() {
  const raw = fs.readFileSync(path.join(localesDir, 'en.ts'), 'utf8')
  const { lit } = extractObjectLiteral(raw)
  return flatten(Function(`"use strict"; return (${lit})`)())
}

let patched = 0
for (const lang of LANGS) {
  const patchPath = path.join(patchesDir, `${lang}.json`)
  if (!fs.existsSync(patchPath)) {
    console.warn(`skip ${lang}: no patch at ${patchPath}`)
    continue
  }
  const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'))
  const current = loadLocaleObject(lang)
  const merged = deepMerge(current, patch)
  writeLocale(lang, merged)
  patched++
  console.log(`patched ${lang}`)
}

const enFlat = loadEnFlat()
for (const lang of LANGS) {
  const flat = flatten(loadLocaleObject(lang))
  const missing = Object.keys(enFlat).filter((k) => !(k in flat))
  console.log(`${lang} still missing: ${missing.length}`)
  if (missing.length && missing.length <= 20) missing.forEach((k) => console.log('  ', k))
}

console.log(`done (${patched} locales)`)
