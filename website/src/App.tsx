import { useEffect, useMemo, useState } from 'react'
import { COPY, THEMES } from './copy'
import { Explore } from './pages/Explore'
import { Home } from './pages/Home'
import { Molly } from './pages/Molly'
import { Releases } from './pages/Releases'
import { Sparks } from './pages/Sparks'
import { Vpn } from './pages/Vpn'
import { DownloadModal, detectOs, type Os } from './Download'
import { SiteCtx, shot, type Mode } from './ui'

const GITHUB = 'https://github.com/magicorntech/magiclens-releases'
const MAGICORN = 'https://magicorn.co/'

type Route = 'home' | 'explore' | 'vpn' | 'molly' | 'sparks' | 'releases'

function parseHash(): { route: Route; anchor: string } {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [first = '', second = ''] = parts
  if (first === 'explore' || first === 'vpn' || first === 'molly' || first === 'sparks' || first === 'releases') {
    return { route: first, anchor: second }
  }
  // "#/#features" and "#/themes" both mean: home, scrolled to a section.
  return { route: 'home', anchor: first.replace(/^#/, '') || second }
}

function initialMode(): Mode {
  try {
    const saved = localStorage.getItem('ml-site-mode')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function GithubIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

export function App(): React.JSX.Element {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [themeId, setThemeId] = useState('violet')
  const [loc, setLoc] = useState(parseHash)
  const [zoomed, setZoomed] = useState<{ name: string; alt: string } | null>(null)
  const [download, setDownload] = useState<{ os: Os } | null>(null)
  const t = COPY
  const theme = THEMES.find((x) => x.id === themeId) ?? THEMES[2]!

  useEffect(() => {
    const onHash = (): void => setLoc(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Scroll to the section named in the URL, or to the top of a new page.
  useEffect(() => {
    const id = loc.anchor
    const el = id ? document.getElementById(id) : null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: 0 })
  }, [loc])

  useEffect(() => {
    document.documentElement.dataset.mode = mode
    try {
      localStorage.setItem('ml-site-mode', mode)
    } catch {
      /* storage unavailable */
    }
  }, [mode])

  useEffect(() => {
    if (!zoomed) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setZoomed(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  // The page itself takes on the chosen theme's accent.
  const accentVars = useMemo(() => {
    const neutral = themeId === 'white' || themeId === 'black'
    const accent = neutral ? (mode === 'dark' ? '#f5f5f7' : '#111114') : theme.accent
    const glow = neutral ? (mode === 'dark' ? '#8a8a99' : '#9a9aa8') : theme.accent2
    return { '--accent': accent, '--glow': glow } as React.CSSProperties
  }, [theme, themeId, mode])

  const ctx = useMemo(
    () => ({
      mode,
      zoom: (name: string, alt: string) => setZoomed({ name, alt }),
      openDownload: (os?: Os) => setDownload({ os: os ?? detectOs() })
    }),
    [mode]
  )
  const link = (route: Route, label: string): React.JSX.Element => (
    <a href={route === 'home' ? '#/' : `#/${route}`} className={loc.route === route ? 'on' : ''}>
      {label}
    </a>
  )

  return (
    <SiteCtx.Provider value={ctx}>
      <div className="site" style={accentVars}>
        <header className="nav">
          <a className="brand" href="#/">
            <img src="/icon-64.png" alt="" width={26} height={26} />
            MagicLens
          </a>
          <nav>
            {link('home', t.nav.product)}
            {link('explore', 'Explore')}
            {link('vpn', 'VPN')}
            {link('molly', 'Molly · AI')}
            {link('sparks', 'Sparks')}
            {link('releases', 'Releases')}
            <a href="#/themes">{t.nav.themes}</a>
          </nav>
          <div className="nav-tools">
            <button
              className="mode"
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {mode === 'dark' ? '☀' : '☾'}
            </button>
            <a className="icon-link" href={GITHUB} aria-label="MagicLens releases on GitHub" title="Releases on GitHub">
              <GithubIcon />
            </a>
            <button className="btn btn--small" onClick={() => ctx.openDownload()}>
              {t.nav.download}
            </button>
          </div>
        </header>

        <main id="top">
          {loc.route === 'home' ? <Home mode={mode} setMode={setMode} themeId={themeId} setThemeId={setThemeId} /> : null}
          {loc.route === 'explore' ? <Explore /> : null}
          {loc.route === 'vpn' ? <Vpn /> : null}
          {loc.route === 'molly' ? <Molly /> : null}
          {loc.route === 'sparks' ? <Sparks /> : null}
          {loc.route === 'releases' ? <Releases /> : null}

          <section className="download" id="download">
            <h2>{t.download.title}</h2>
            <p>{t.download.copy}</p>
            <div className="cta cta--center">
              {([
                [t.download.mac, 'mac'],
                [t.download.win, 'windows'],
                [t.download.linux, 'linux']
              ] as const).map(([label, os]) => (
                <button key={label} className="btn" onClick={() => ctx.openDownload(os)}>
                  {label}
                </button>
              ))}
              <a className="btn btn--ghost" href={GITHUB}>
                <GithubIcon /> &nbsp;GitHub
              </a>
            </div>
            <small>{t.download.note}</small>
          </section>
        </main>

        <footer>
          <span>
            {t.footer.text}{' '}
            <a href={MAGICORN} target="_blank" rel="noreferrer">
              {t.footer.team}
            </a>
            . {t.footer.note} · <a href="#/releases">Release notes</a>
          </span>
        </footer>

        {download ? <DownloadModal initialOs={download.os} onClose={() => setDownload(null)} /> : null}

        {zoomed ? (
          <div className="lightbox" role="dialog" aria-modal onClick={() => setZoomed(null)}>
            <button className="lightbox-close" aria-label={t.close}>
              ×
            </button>
            <picture>
              <source type="image/avif" srcSet={shot(zoomed.name)} />
              <img src={shot(zoomed.name, 'webp')} alt={zoomed.alt} />
            </picture>
          </div>
        ) : null}
      </div>
    </SiteCtx.Provider>
  )
}
