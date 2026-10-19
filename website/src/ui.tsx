import { createContext, useContext, useEffect, useRef } from 'react'

export type Mode = 'light' | 'dark'
export type Pair = string

/** Dark mode shows the black-theme capture of the same screen (`<name>-dark`). */
export const variant = (name: string, mode: Mode): string => (mode === 'dark' ? `${name}-dark` : name)

// AVIF comes in 1920 and full 4K; the WebP fallback is 1920 only.
export const shot = (name: string, ext: 'avif' | 'webp' = 'avif', small = false): string =>
  `/media/shots/${name}${small || ext === 'webp' ? '-1920' : ''}.${ext}`

interface Ctx {
  mode: Mode
  zoom: (name: string, alt: string) => void
  /** Opens the download dialog, optionally on a given system tab. */
  openDownload: (os?: 'mac' | 'windows' | 'linux') => void
}
export const SiteCtx = createContext<Ctx>({ mode: 'light', zoom: () => undefined, openDownload: () => undefined })
export const useSite = (): Ctx => useContext(SiteCtx)

/** AVIF first, WebP fallback; 1920 variant for normal screens, full 4K for large/retina ones. */
export function Pic({
  name,
  alt,
  eager,
  zoomable = true,
  fixed
}: {
  name: string
  alt: string
  eager?: boolean
  zoomable?: boolean
  /** Use this exact file in both modes (no -dark twin). */
  fixed?: boolean
}): React.JSX.Element {
  const { zoom, mode } = useSite()
  const file = fixed || name.startsWith('theme-') ? name : variant(name, mode)
  return (
    <picture>
      <source
        type="image/avif"
        srcSet={`${shot(file, 'avif', true)} 1920w, ${shot(file, 'avif')} 3840w`}
        sizes="(max-width: 1200px) 100vw, 1200px"
      />
      <img
        src={shot(file, 'webp')}
        alt={alt}
        width={3840}
        height={2160}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onClick={zoomable ? () => zoom(file, alt) : undefined}
        style={zoomable ? { cursor: 'zoom-in' } : undefined}
      />
    </picture>
  )
}

/** Looping product video; plays only while on screen. AV1 first, H.264 as the fallback. */
export function Clip({ name, label, fixed }: { name: string; label: string; fixed?: boolean }): React.JSX.Element {
  const ref = useRef<HTMLVideoElement>(null)
  const { mode } = useSite()
  const file = fixed ? name : variant(name, mode)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void el.play().catch(() => undefined)
        else el.pause()
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="metadata"
      key={file}
      poster={`/media/video/${file}-poster.avif`}
      aria-label={label}
    >
      <source src={`/media/video/${file}.av1.mp4`} type='video/mp4; codecs="av01.0.12M.10"' />
      <source src={`/media/video/${file}.h264.mp4`} type='video/mp4; codecs="avc1.640033"' />
    </video>
  )
}

export function Window({
  children,
  title
}: {
  children: React.ReactNode
  title?: string
}): React.JSX.Element {
  return (
    <div className="win">
      <div className="win-bar">
        <i />
        <i />
        <i />
        {title ? <span>{title}</span> : null}
      </div>
      <div className="win-body">{children}</div>
    </div>
  )
}

/** A section whose copy sits beside a clip. */
export function Feature({
  id,
  video,
  kicker,
  title,
  copy,
  bullets,
  flip,
}: {
  id?: string
  video: string
  kicker: Pair
  title: Pair
  copy: Pair
  bullets?: readonly Pair[]
  flip?: boolean
}): React.JSX.Element {
  return (
    <section className={`feature${flip ? ' feature--flip' : ''}`} id={id}>
      <div className="feature-text">
        <span className="kicker">{kicker}</span>
        <h3>{title}</h3>
        <p>{copy}</p>
        {bullets ? (
          <ul>
            {bullets.map((b) => (
              <li key={b[0]}>{b}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <Window>
        <Clip name={video} label={title} />
      </Window>
    </section>
  )
}

/** A strip of captioned stills that open full size. */
export function Shots({
  items,
  cols = 3
}: {
  items: ReadonlyArray<{ id: string; cap: Pair }>
  cols?: 1 | 2 | 3
}): React.JSX.Element {
  return (
    <div className={`shots shots--${cols}`}>
      {items.map((s) => (
        <figure key={s.id}>
          <Pic name={s.id} alt={s.cap} />
          <figcaption>{s.cap}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export function PageHero({
  kicker,
  title,
  em,
  lede,
  video,
}: {
  kicker: Pair
  title: Pair
  em: Pair
  lede: Pair
  video: string
}): React.JSX.Element {
  return (
    <section className="hero hero--page">
      <span className="eyebrow">{kicker}</span>
      <h1>
        {title}
        <br />
        <em>{em}</em>
      </h1>
      <p className="lede">{lede}</p>
      <div className="hero-stage">
        <div className="glow" aria-hidden />
        <Window>
          <Clip name={video} label={title} />
        </Window>
      </div>
    </section>
  )
}

export function CardGrid({
  items,
}: {
  items: ReadonlyArray<{ title: Pair; copy: Pair }>
}): React.JSX.Element {
  return (
    <div className="cards">
      {items.map((c) => (
        <article key={c.title[0]}>
          <h4>{c.title}</h4>
          <p>{c.copy}</p>
        </article>
      ))}
    </div>
  )
}
