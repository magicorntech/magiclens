import { useState } from 'react'
import { COPY, PAGES, THEMES, MOSAIC } from '../copy'
import { Clip, Feature, Pic, Shots, Window, useSite, variant, type Mode, type Pair } from '../ui'

const FEATURES: Array<{
  id: string
  video: string
  kicker: Pair
  title: Pair
  copy: Pair
  bullets: readonly Pair[]
  shots: ReadonlyArray<{ id: string; cap: Pair }>
}> = [
  {
    id: 'tour',
    video: 'tour',
    kicker: 'Navigate',
    title: 'Every page, every cluster — a click apart.',
    copy: 'Jump from Nodes to Topology, Visualizer, Helm, Argo CD and the event Timeline, then hop to another cluster and do it again. Pages open as tabs per cluster, so you never lose your place.',
    bullets: [
      'Browser-style tabs per cluster',
      'Grouped resource menu with favourites',
      'Workspaces for prod, staging and test'
    ],
    shots: []
  },
  {
    id: 'split-clusters',
    video: 'split-clusters',
    kicker: 'Split view · between clusters',
    title: 'Two clusters, side by side.',
    copy: 'Compare production and staging in one window. Each pane has its own menu, tabs and page — a topology on the left, pods on the right — and you can swap either pane to another cluster with one click.',
    bullets: [
      'Independent navigation per pane',
      'Swap a pane to any open cluster',
      'One shortcut to enter or leave'
    ],
    shots: [
      { id: 'feat-split-clusters', cap: 'Prod and staging, each on its own page' }
    ]
  },
  {
    id: 'split-inner',
    video: 'split-inner',
    kicker: 'Split view · inside a cluster',
    title: 'Two resource windows in one cluster.',
    copy: 'Keep Pods next to Deployments, or Deployments next to Events, inside the same cluster. Change either side whenever you like and exit the split when you are done.',
    bullets: [
      'Any two resource kinds side by side',
      'Focus a pane to drive it',
      'Works with the detail panel too'
    ],
    shots: [
      { id: 'feat-split-inner', cap: 'Pods and Deployments' },
      { id: 'feat-split-inner-events', cap: 'Deployments and Events' }
    ]
  },
  {
    id: 'sidebar-collapse',
    video: 'sidebar-collapse',
    kicker: 'Collapse',
    title: 'Everything folds away — not just the sidebar.',
    copy: 'Collapse workspaces, favourites, each resource group or the whole menu down to icons. The chrome adapts to the job, so the cluster gets the room.',
    bullets: [
      'Workspaces and favourites collapse',
      'Resource groups open one at a time',
      'Icon-only menu and sidebar'
    ],
    shots: [
      { id: 'feat-favorites-open', cap: 'Favourites' },
      { id: 'feat-menu-collapsed', cap: 'Resource menu as icons' },
      { id: 'feat-sidebar-collapsed', cap: 'Sidebar as icons' }
    ]
  },
  {
    id: 'detail-resize',
    video: 'detail-resize',
    kicker: 'Details',
    title: 'Pull a detail page wider — or push it back.',
    copy: 'Open any resource and drag its left edge: more tabs appear and logs get room to breathe. Shrink it again to keep the table in view. The width is remembered.',
    bullets: [
      'Overview, Events, Pods, Logs, YAML',
      'Scale and restart from the header',
      'Notes from Sparks in the same panel'
    ],
    shots: []
  }
]

export function Home({
  mode,
  setMode,
  themeId,
  setThemeId
}: {
  mode: Mode
  setMode: (m: Mode) => void
  themeId: string
  setThemeId: (id: string) => void
}): React.JSX.Element {
  const t = COPY
  const { zoom, openDownload } = useSite()
  const [themeView, setThemeView] = useState<'Pods' | 'topology'>('Pods')
  const [page, setPage] = useState('topology')
  const theme = THEMES.find((x) => x.id === themeId) ?? THEMES[2]!
  const themeShot = `theme-${themeId}-${mode}${themeView === 'topology' ? '-topology' : ''}`
  const pageShot = variant(page, mode)
  const pageLabel = PAGES.find((p) => p.id === page)?.label ?? page

  return (
    <>
      <section className="hero">
        <span className="eyebrow">{t.hero.eyebrow}</span>
        <h1>
          {t.hero.title}
          <br />
          <em>{t.hero.em}</em>
        </h1>
        <p className="lede">{t.hero.lede}</p>
        <div className="cta">
          <button className="btn" onClick={() => openDownload()}>
            {t.hero.cta}
          </button>
          <a className="btn btn--ghost" href="#/#features">
            {t.hero.secondary} ↓
          </a>
        </div>
        <div className="hero-stage">
          <div className="glow" aria-hidden />
          <Window>
            <Clip name="tour" label="MagicLens tour" />
          </Window>
        </div>
      </section>

      <section className="facts">
        {t.facts.map(([n, label]) => (
          <div key={label}>
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <div id="features" className="features">
        <h2 className="section-title">{t.featuresTitle}</h2>
        {FEATURES.map((f, i) => (
          <div key={f.id} className="area">
            <Feature
              id={f.id}
              video={f.video}
              kicker={f.kicker}
              title={f.title}
              copy={f.copy}
              bullets={f.bullets}
              flip={i % 2 === 1}
            />
            {f.shots.length ? <Shots items={f.shots} cols={f.shots.length as 1 | 2 | 3} /> : null}
          </div>
        ))}
      </div>

      <section className="teasers">
        {[
          { href: '#/explore', k: 'Explore', h: 'Nodes to security, page by page', shot: 'feat-topology-selected' },
          { href: '#/vpn', k: 'VPN', h: 'Private clusters, one click away', shot: 'feat-vpn-connected' },
          { href: '#/molly', k: 'Molly · AI', h: 'A read-only assistant for your clusters', shot: 'feat-molly-nodes' },
          { href: '#/sparks', k: 'Sparks · Notes', h: 'Runbooks, links and a map of it all', shot: 'feat-sparks-graph' }
        ].map((c) => (
          <a key={c.href} className="teaser" href={c.href}>
            <Pic name={c.shot} alt={c.h} zoomable={false} />
            <div>
              <span className="kicker">{c.k}</span>
              <h3>{c.h}</h3>
              <span className="more">See details →</span>
            </div>
          </a>
        ))}
      </section>

      <section className="band" id="themes">
        <div className="band-head">
          <span className="kicker">{t.themes.kicker}</span>
          <h2>{t.themes.title}</h2>
          <p>{t.themes.copy}</p>
        </div>
        <div className="theme-reel">
          <Window>
            <Clip name="themes" label="Switching between colour themes" fixed />
          </Window>
        </div>
        <div className="theme-controls">
          <div className="swatches" role="group" aria-label={t.themes.kicker}>
            {THEMES.map((th) => (
              <button
                key={th.id}
                className={`swatch${th.id === themeId ? ' on' : ''}`}
                onClick={() => setThemeId(th.id)}
                title={th.name}
              >
                <span style={{ background: `linear-gradient(135deg, ${th.accent} 50%, ${th.accent2} 50%)` }} />
                {th.name}
              </button>
            ))}
          </div>
          <div className="toggles">
            <div className="seg">
              {(['light', 'dark'] as const).map((m) => (
                <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                  {t.themes[m]}
                </button>
              ))}
            </div>
            <div className="seg">
              {(['Pods', 'topology'] as const).map((v) => (
                <button key={v} className={themeView === v ? 'on' : ''} onClick={() => setThemeView(v)}>
                  {v === 'Pods' ? 'Pods' : 'Topology'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Window title={`${theme.name} · ${mode}`}>
          <Pic key={themeShot} name={themeShot} alt={`MagicLens in the ${theme.name} theme`} />
        </Window>
      </section>

      <section className="band band--plain" id="pages">
        <div className="band-head">
          <span className="kicker">{t.pages.kicker}</span>
          <h2>{t.pages.title}</h2>
          <p>{t.pages.copy}</p>
        </div>
        <div className="theme-controls">
          <div className="tabs" role="tablist">
            {PAGES.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={p.id === page}
                className={p.id === page ? 'on' : ''}
                onClick={() => setPage(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="seg">
            {(['light', 'dark'] as const).map((m) => (
              <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                {t.pages[m]}
              </button>
            ))}
          </div>
        </div>
        <Window title={pageLabel}>
          <Pic key={pageShot} name={page} alt={pageLabel} />
        </Window>
        <button className="link" onClick={() => zoom(pageShot, pageLabel)}>
          {t.pages.open} ↗
        </button>
      </section>

      <section className="mosaic-wrap">
        <div className="band-head">
          <span className="kicker">{t.mosaic.kicker}</span>
          <h2>{t.mosaic.title}</h2>
        </div>
        <div className="mosaic">
          {MOSAIC.map((m) => (
            <figure key={m.id}>
              <Pic name={m.id} alt={m.caption} />
              <figcaption>{m.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  )
}
