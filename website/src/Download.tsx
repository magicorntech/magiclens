import { useEffect, useMemo, useState } from 'react'

const API = 'https://api.github.com/repos/magicorntech/magiclens/releases?per_page=30'
const RELEASES_PAGE = 'https://github.com/magicorntech/magiclens/releases'
const CACHE_KEY = 'ml-releases-v1'
const CACHE_MS = 10 * 60 * 1000

export type Os = 'mac' | 'windows' | 'linux'

interface Asset {
  name: string
  size: number
  browser_download_url: string
}

interface Release {
  tag_name: string
  name: string | null
  published_at: string
  prerelease: boolean
  draft: boolean
  assets: Asset[]
}

export function detectOs(): Os {
  const ua = `${navigator.userAgent} ${navigator.platform ?? ''}`.toLowerCase()
  if (ua.includes('win')) return 'windows'
  if (ua.includes('linux') && !ua.includes('android')) return 'linux'
  return 'mac'
}

function useReleases(enabled: boolean): { releases: Release[] | null; error: boolean } {
  const [releases, setReleases] = useState<Release[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!enabled || releases) return
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (raw) {
        const cached = JSON.parse(raw) as { at: number; data: Release[] }
        if (Date.now() - cached.at < CACHE_MS) {
          setReleases(cached.data)
          return
        }
      }
    } catch {
      /* storage unavailable */
    }
    let alive = true
    fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? (r.json() as Promise<Release[]>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        const list = data.filter((r) => !r.draft && r.assets.some((a) => /\.(dmg|exe|AppImage|deb|rpm)$/i.test(a.name)))
        if (!alive) return
        setReleases(list)
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: list }))
        } catch {
          /* storage unavailable */
        }
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [enabled, releases])

  return { releases, error }
}

interface Choice {
  label: string
  hint: string
  asset: Asset
}

function choicesFor(os: Os, assets: Asset[]): Choice[] {
  const out: Choice[] = []
  for (const a of assets) {
    const n = a.name
    if (/\.blockmap$|\.ya?ml$/i.test(n)) continue
    if (os === 'mac') {
      const arm = /arm64/i.test(n)
      if (/\.dmg$/i.test(n)) out.push({ label: arm ? 'Apple Silicon' : 'Intel', hint: 'Disk image (.dmg)', asset: a })
      else if (/mac\.zip$/i.test(n)) out.push({ label: arm ? 'Apple Silicon' : 'Intel', hint: 'ZIP archive', asset: a })
    } else if (os === 'windows') {
      if (/\.exe$/i.test(n)) out.push({ label: 'Windows 10 / 11 (x64)', hint: 'Installer (.exe)', asset: a })
    } else {
      if (/\.AppImage$/i.test(n)) out.push({ label: 'Any distribution (x64)', hint: 'AppImage', asset: a })
      else if (/\.deb$/i.test(n)) out.push({ label: 'Debian / Ubuntu (x64)', hint: 'Package (.deb)', asset: a })
      else if (/\.rpm$/i.test(n)) out.push({ label: 'Fedora / RHEL (x64)', hint: 'Package (.rpm)', asset: a })
    }
  }
  // Disk images first, archives after.
  return out.sort((x, y) => Number(/zip/i.test(x.hint)) - Number(/zip/i.test(y.hint)))
}

const mb = (n: number): string => `${(n / 1024 / 1024).toFixed(0)} MB`
const when = (iso: string): string =>
  new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })

const OS_LABEL: Record<Os, string> = { mac: 'macOS', windows: 'Windows', linux: 'Linux' }

function OsIcon({ os }: { os: Os }): React.JSX.Element {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true } as const
  if (os === 'mac')
    return (
      <svg {...common}>
        <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.700 2.400 2.900 2.300 1.200 0 1.600-.7 3-.7s1.800.7 3 .7c1.300 0 2.100-1.100 2.800-2.200.9-1.300 1.300-2.500 1.300-2.600-.1 0-2.500-1-2.500-3.900ZM14.100 5.700c.6-.8 1-1.800.9-2.900-.9 0-2 .6-2.600 1.400-.6.700-1.100 1.800-.9 2.800 1 .1 2-.5 2.600-1.300Z" />
      </svg>
    )
  if (os === 'windows')
    return (
      <svg {...common}>
        <path d="M3 5.5 10.500 4.500v7H3v-6Zm8.500-1.100L21 3v8.500h-9.500V4.400ZM3 12.500h7.500v7L3 18.500v-6Zm8.500 0H21V21l-9.500-1.300v-7.200Z" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M12 2c-2 0-3.300 1.800-3.300 4.200 0 1.500.4 2.600-.4 3.900-1 1.700-2.800 3.700-2.800 6 0 .900.300 1.500.800 1.900-.300.600-.200 1.300.4 1.700.900.600 2.200.200 3.200.800.800.500 1.300 1.500 2.200 1.500s1.400-1 2.200-1.500c1-.6 2.300-.2 3.200-.8.600-.4.700-1.100.4-1.700.500-.4.800-1 .800-1.900 0-2.300-1.800-4.300-2.800-6-.800-1.300-.4-2.400-.4-3.900C15.300 3.800 14 2 12 2Z" />
    </svg>
  )
}

export function DownloadModal({ initialOs, onClose }: { initialOs: Os; onClose: () => void }): React.JSX.Element {
  const [os, setOs] = useState<Os>(initialOs)
  const [tag, setTag] = useState<string | null>(null)
  const { releases, error } = useReleases(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const release = useMemo(() => {
    if (!releases?.length) return null
    return releases.find((r) => r.tag_name === tag) ?? releases[0]!
  }, [releases, tag])
  const choices = release ? choicesFor(os, release.assets) : []
  const latestTag = releases?.[0]?.tag_name

  return (
    <div className="modal-back" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal aria-label="Download MagicLens" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2>Download MagicLens</h2>
        <p className="modal-sub">Pick your system and a version. Files come straight from GitHub Releases.</p>

        <div className="os-tabs" role="tablist">
          {(['mac', 'windows', 'linux'] as const).map((o) => (
            <button key={o} role="tab" aria-selected={os === o} className={os === o ? 'on' : ''} onClick={() => setOs(o)}>
              <OsIcon os={o} />
              {OS_LABEL[o]}
            </button>
          ))}
        </div>

        {error ? (
          <div className="modal-note">
            GitHub could not be reached right now.{' '}
            <a href={RELEASES_PAGE} target="_blank" rel="noreferrer">
              Open the releases page ↗
            </a>
          </div>
        ) : !releases ? (
          <div className="modal-note">Loading versions…</div>
        ) : (
          <>
            <label className="ver-row">
              <span>Version</span>
              <select value={release?.tag_name ?? ''} onChange={(e) => setTag(e.target.value)}>
                {releases.map((r) => (
                  <option key={r.tag_name} value={r.tag_name}>
                    {r.tag_name}
                    {r.tag_name === latestTag ? ' — latest' : ''}
                    {r.prerelease ? ' — pre-release' : ''}
                  </option>
                ))}
              </select>
              {release ? <small>Published {when(release.published_at)}</small> : null}
            </label>

            {choices.length === 0 ? (
              <div className="modal-note">
                No {OS_LABEL[os]} build was attached to {release?.tag_name}.{' '}
                <a href={`${RELEASES_PAGE}/tag/${release?.tag_name}`} target="_blank" rel="noreferrer">
                  See the release ↗
                </a>
              </div>
            ) : (
              <ul className="dl-list">
                {choices.map((c) => (
                  <li key={c.asset.name}>
                    <div>
                      <strong>{c.label}</strong>
                      <span>
                        {c.hint} · {mb(c.asset.size)}
                      </span>
                    </div>
                    <a className="btn btn--small" href={c.asset.browser_download_url} onClick={() => undefined}>
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {release ? (
              <div className="modal-foot">
                <a href={`#/releases`} onClick={onClose}>
                  Release notes
                </a>
                <a href={`${RELEASES_PAGE}/tag/${release.tag_name}`} target="_blank" rel="noreferrer">
                  {release.tag_name} on GitHub ↗
                </a>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
