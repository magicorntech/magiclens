import { WHATS_NEW } from '../../../src/shared/whatsNew'

const REPO = 'https://github.com/magicorntech/magiclens'

/** Newest first, by numeric version. */
function sortedVersions(): string[] {
  return Object.keys(WHATS_NEW).sort((a, b) => {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      const d = (pb[i] ?? 0) - (pa[i] ?? 0)
      if (d !== 0) return d
    }
    return 0
  })
}

export function Releases(): React.JSX.Element {
  const versions = sortedVersions()
  return (
    <>
      <section className="hero hero--page hero--compact">
        <span className="eyebrow">Release notes</span>
        <h1>
          What's new,
          <br />
          <em>version by version.</em>
        </h1>
        <p className="lede">
          Every MagicLens release with what changed for you — straight from the notes the app shows after an update.
        </p>
      </section>

      <div className="releases">
        <ol className="timeline">
          {versions.map((v, i) => {
            const entry = WHATS_NEW[v]!
            return (
              <li key={v} id={`v${v}`} className={i === 0 ? 'is-latest' : undefined}>
                <div className="timeline-meta">
                  <span className="version">v{v}</span>
                  {i === 0 ? <span className="badge">Latest</span> : null}
                </div>
                <article>
                  <h3>{entry.title}</h3>
                  <ul>
                    {entry.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <a className="link" href={`${REPO}/releases/tag/v${v}`} target="_blank" rel="noreferrer">
                    Release on GitHub ↗
                  </a>
                </article>
              </li>
            )
          })}
        </ol>
        <p className="releases-foot">
          Older releases and installers are on{' '}
          <a href={`${REPO}/releases`} target="_blank" rel="noreferrer">
            GitHub
          </a>
          .
        </p>
      </div>
    </>
  )
}
