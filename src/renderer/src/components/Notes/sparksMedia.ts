/** Vault-relative path → privileged Electron media URL. */
export function toSparksMediaUrl(relativePath: string): string {
  const rel = relativePath
    .replace(/^\.?\//, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  const encoded = rel.split('/').map(encodeURIComponent).join('/')
  return `sparks-media://local/${encoded}`
}

/** Prefer display URL for markdown / <img> / canvas. */
export function mediaDisplayUrl(
  pathOrUrl: string,
  preferredSrc?: string | null
): string {
  if (preferredSrc) return preferredSrc
  if (/^(https?:|data:|file:|blob:|sparks-media:)/i.test(pathOrUrl)) return pathOrUrl
  return toSparksMediaUrl(pathOrUrl)
}
