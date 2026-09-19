import { useEffect, useState } from 'react'
import { LiveApp, type LiveMode } from './live/LiveApp'

type Lang = 'en' | 'tr'

const COPY = {
  en: {
    product: 'Product',
    download: 'Download',
    cta: 'Get the app',
    badge: 'Live demo',
    eyebrow: 'Native desktop · macOS, Windows, Linux',
    title: 'Every cluster.<br><em>One window.</em>',
    lede: 'Same MagicLens chrome — cluster tabs, resource menu, split panes — filled with demo data. Scroll the sections and try each feature.',
    try: 'Try it below',
    signed: 'Signed & notarized installers',
    local: 'Cluster data stays on your machine',
    sections: [
      {
        id: 'product',
        mode: 'app' as LiveMode,
        kicker: 'Multi-cluster',
        title: 'Tabs + split view.',
        copy: 'Open aurora-prod and aurora-staging side by side. Left pane Visualizer, right pane Topology — each pane keeps its own page.',
        theme: false,
        tall: false
      },
      {
        id: 'clusters',
        mode: 'clusters' as LiveMode,
        kicker: 'Clusters',
        title: 'Hub, favorites, workspaces.',
        copy: 'Scan kubeconfigs, pin favorites, group by workspace. Connection state and endpoints stay visible.',
        theme: false,
        tall: false
      },
      {
        id: 'nodes',
        mode: 'nodes' as LiveMode,
        kicker: 'Nodes',
        title: 'Fleet overview, not only a table.',
        copy: 'Kubelet versions, roles, health strip, CPU / memory / pod capacity, then the node list — same layout as the desktop Nodes page.',
        theme: false,
        tall: true
      },
      {
        id: 'workloads',
        mode: 'pods' as LiveMode,
        kicker: 'Workloads',
        title: 'Pods table → detail → logs / exec.',
        copy: 'Live-style columns (CPU, memory, containers, controlled-by). Click a row for Overview, Logs, or Exec.',
        theme: true,
        tall: true
      },
      {
        id: 'visualizer',
        mode: 'visualizer' as LiveMode,
        kicker: 'Visualizer',
        title: 'Namespaces as maps.',
        copy: 'Service cards, ingress/egress chips, workload logos, replica squares — grouped by namespace the way the app draws them.',
        theme: false,
        tall: true
      },
      {
        id: 'topology',
        mode: 'topology' as LiveMode,
        kicker: 'Topology',
        title: 'Owns, selects, mounts.',
        copy: 'One namespace graph: Deployment → ReplicaSet → Pod, plus Service and ConfigMap. Switch namespace or Applications.',
        theme: false,
        tall: true
      },
      {
        id: 'helm',
        mode: 'helm' as LiveMode,
        kicker: 'Helm',
        title: 'Charts and Releases.',
        copy: 'Catalog search, chart README, values.yaml, Deploy — then flip to installed releases with revision history.',
        theme: false,
        tall: true
      },
      {
        id: 'storage',
        mode: 'storage' as LiveMode,
        kicker: 'Storage',
        title: 'PVCs with fullness bars.',
        copy: 'Capacity, used bytes, percent full. Amber when a volume is filling up — catalog-idx at 78%.',
        theme: false,
        tall: false
      },
      {
        id: 'network',
        mode: 'ingress' as LiveMode,
        kicker: 'Network',
        title: 'Ingress hosts, clipped clean.',
        copy: 'First host plus +N when there are more — no overflow into Status or Age.',
        theme: false,
        tall: false
      },
      {
        id: 'timeline',
        mode: 'timeline' as LiveMode,
        kicker: 'Timeline',
        title: 'Events as a Gantt.',
        copy: 'Namespaced events grouped by object. Density strip, Warning vs Normal, hover for reason and count.',
        theme: false,
        tall: true
      },
      {
        id: 'argo',
        mode: 'argocd' as LiveMode,
        kicker: 'Argo CD',
        title: 'Sync status in the sidebar.',
        copy: 'Applications with Sync / Health from argoproj CRDs — Sync and Refresh without a separate Argo token.',
        theme: false,
        tall: false
      }
    ],
    operate: 'Operate',
    ot: 'Scale, exec, tail, <em>ship.</em>',
    oc: 'The desktop app goes further — Helm deploy, Argo sync, Grafana port-forward, Sparks notes — on your kubeconfig.',
    dl: 'Download',
    dlt: 'Get the latest <em>signed</em> build.',
    dlc: 'Installers live on GitHub Releases. There is nothing to clone or compile.',
    mac: 'Apple Silicon and Intel. Developer ID signed and notarized.',
    win: 'x64 installer. Authenticode-signed.',
    linux: 'AppImage or .deb for x64.',
    all: 'All versions',
    support: 'Support',
    hint: 'Every frame is interactive demo data. Nothing is uploaded.'
  },
  tr: {
    product: 'Ürün',
    download: 'İndir',
    cta: 'Uygulamayı al',
    badge: 'Canlı demo',
    eyebrow: 'Yerel masaüstü · macOS, Windows, Linux',
    title: 'Tüm cluster’lar.<br><em>Tek pencere.</em>',
    lede: 'Aynı MagicLens chrome — cluster sekmeleri, resource menü, split — demo veriyle. Bölümleri kaydır, her özelliği dene.',
    try: 'Aşağıda dene',
    signed: 'İmzalı ve noter onaylı kurulumlar',
    local: 'Cluster verisi makinede kalır',
    sections: [
      {
        id: 'product',
        mode: 'app' as LiveMode,
        kicker: 'Multi-cluster',
        title: 'Sekme + split view.',
        copy: 'aurora-prod ve aurora-staging yan yana. Solda Visualizer, sağda Topology — her panel kendi sayfasını tutar.',
        theme: false,
        tall: false
      },
      {
        id: 'clusters',
        mode: 'clusters' as LiveMode,
        kicker: 'Cluster’lar',
        title: 'Hub, favori, workspace.',
        copy: 'Kubeconfig tara, favori sabitle, workspace ile grupla. Bağlantı durumu ve endpoint görünür kalır.',
        theme: false,
        tall: false
      },
      {
        id: 'nodes',
        mode: 'nodes' as LiveMode,
        kicker: 'Nodes',
        title: 'Filo özeti, sadece tablo değil.',
        copy: 'Kubelet sürümleri, roller, health strip, CPU / bellek / pod kapasitesi, sonra node listesi — masaüstü Nodes sayfası.',
        theme: false,
        tall: true
      },
      {
        id: 'workloads',
        mode: 'pods' as LiveMode,
        kicker: 'Workloads',
        title: 'Pod tablosu → detay → logs / exec.',
        copy: 'Canlı kolonlar (CPU, bellek, container, controlled-by). Satıra tıkla: Overview, Logs veya Exec.',
        theme: true,
        tall: true
      },
      {
        id: 'visualizer',
        mode: 'visualizer' as LiveMode,
        kicker: 'Visualizer',
        title: 'Namespace’ler harita.',
        copy: 'Service kartı, ingress/egress, workload logosu, replica kareleri — uygulamanın çizdiği gibi.',
        theme: false,
        tall: true
      },
      {
        id: 'topology',
        mode: 'topology' as LiveMode,
        kicker: 'Topology',
        title: 'Owns, selects, mounts.',
        copy: 'Tek namespace grafiği: Deployment → ReplicaSet → Pod; Service ve ConfigMap. Namespace veya Applications.',
        theme: false,
        tall: true
      },
      {
        id: 'helm',
        mode: 'helm' as LiveMode,
        kicker: 'Helm',
        title: 'Charts ve Releases.',
        copy: 'Katalog araması, chart README, values.yaml, Deploy — sonra kurulu release’ler ve revision.',
        theme: false,
        tall: true
      },
      {
        id: 'storage',
        mode: 'storage' as LiveMode,
        kicker: 'Storage',
        title: 'PVC doluluk çubukları.',
        copy: 'Kapasite, kullanılan, yüzde. Dolunca amber — catalog-idx %78.',
        theme: false,
        tall: false
      },
      {
        id: 'network',
        mode: 'ingress' as LiveMode,
        kicker: 'Network',
        title: 'Ingress host’ları temiz.',
        copy: 'İlk host +N — Status / Age’e taşma yok.',
        theme: false,
        tall: false
      },
      {
        id: 'timeline',
        mode: 'timeline' as LiveMode,
        kicker: 'Timeline',
        title: 'Event’ler Gantt.',
        copy: 'Namespaced event’ler objeye göre. Density strip, Warning / Normal, hover ile reason.',
        theme: false,
        tall: true
      },
      {
        id: 'argo',
        mode: 'argocd' as LiveMode,
        kicker: 'Argo CD',
        title: 'Sync durumu sidebar’da.',
        copy: 'Applications Sync / Health — ayrı Argo token olmadan Sync ve Refresh.',
        theme: false,
        tall: false
      }
    ],
    operate: 'Operasyon',
    ot: 'Scale, exec, tail, <em>yayınla.</em>',
    oc: 'Masaüstü uygulaması Helm deploy, Argo sync, Grafana port-forward, Sparks — kubeconfig’inle.',
    dl: 'İndir',
    dlt: 'Son <em>imzalı</em> sürümü al.',
    dlc: 'Kurulumlar GitHub Releases’ta. Klonlanacak bir şey yok.',
    mac: 'Apple Silicon ve Intel. Developer ID imzalı ve noter onaylı.',
    win: 'x64 kurulum. Authenticode imzalı.',
    linux: 'x64 için AppImage veya .deb.',
    all: 'Tüm sürümler',
    support: 'Destek',
    hint: 'Her çerçeve etkileşimli demo veri. Hiçbir şey yüklenmez.'
  }
} as const

const RELEASES = 'https://github.com/magicorntech/magiclens/releases/latest'

export function App() {
  const [lang, setLang] = useState<Lang>(() =>
    typeof navigator !== 'undefined' && navigator.language.startsWith('tr') ? 'tr' : 'en'
  )
  const [scrolled, setScrolled] = useState(false)
  const t = COPY[lang]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <div className="bg-mesh" />
      <div className="bg-grid" />
      <div className="grain" />
      <div className="site">
        <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
          <div className="nav-inner">
            <a className="brand" href="#top">
              <img src="/icon-180.png" alt="" />
              MagicLens
            </a>
            <nav className="nav-links">
              <a href="#product">{t.product}</a>
              <a href="#download">{t.download}</a>
            </nav>
            <div className="nav-spacer" />
            <div className="lang">
              <button type="button" className={lang === 'en' ? 'is-on' : ''} onClick={() => setLang('en')}>
                EN
              </button>
              <button type="button" className={lang === 'tr' ? 'is-on' : ''} onClick={() => setLang('tr')}>
                TR
              </button>
            </div>
            <a className="btn btn-coral nav-cta" href="#download">
              {t.cta}
            </a>
          </div>
        </header>

        <main id="top">
          <section className="hero wrap">
            <div className="eyebrow">
              <b>{t.badge}</b>
              <span>{t.eyebrow}</span>
            </div>
            <h1 dangerouslySetInnerHTML={{ __html: t.title }} />
            <p className="lede">{t.lede}</p>
            <div className="hero-actions">
              <a className="btn btn-coral" href="#product">
                {t.try}
              </a>
              <a className="btn btn-ghost" href="#download">
                {t.cta}
              </a>
            </div>
            <p className="hero-meta">
              <span>{t.signed}</span> · <span>{t.local}</span>
            </p>
            <div className="stage">
              <LiveApp mode="app" lang={lang} />
            </div>
          </section>

          {t.sections.map((s) => (
            <section key={s.id} id={s.id}>
              <div className="wrap">
                <p className="section-kicker">{s.kicker}</p>
                <h2 className="section-title">{s.title}</h2>
                <p className="section-copy">{s.copy}</p>
                {s.id === 'product' ? <p className="feature-note" style={{ marginBottom: 18 }}>{t.hint}</p> : null}
                <LiveApp mode={s.mode} tall={s.tall} showThemeBar={s.theme} lang={lang} />
              </div>
            </section>
          ))}

          <section>
            <div className="wrap">
              <p className="section-kicker">{t.operate}</p>
              <h2 className="section-title" dangerouslySetInnerHTML={{ __html: t.ot }} />
              <p className="section-copy">{t.oc}</p>
            </div>
          </section>

          <section className="download" id="download">
            <div className="wrap">
              <p className="section-kicker">{t.dl}</p>
              <h2 className="section-title" dangerouslySetInnerHTML={{ __html: t.dlt }} />
              <p className="section-copy">{t.dlc}</p>
              <div className="os-grid">
                <article className="os-card is-suggested">
                  <span className="suggested">macOS</span>
                  <h3>macOS</h3>
                  <p>{t.mac}</p>
                  <a className="btn btn-coral" href={RELEASES}>
                    {t.download}
                  </a>
                </article>
                <article className="os-card">
                  <span className="suggested" />
                  <h3>Windows</h3>
                  <p>{t.win}</p>
                  <a className="btn btn-coral" href={RELEASES}>
                    {t.download}
                  </a>
                </article>
                <article className="os-card">
                  <span className="suggested" />
                  <h3>Linux</h3>
                  <p>{t.linux}</p>
                  <a className="btn btn-coral" href={RELEASES}>
                    {t.download}
                  </a>
                </article>
              </div>
              <p className="hero-meta" style={{ marginTop: 28 }}>
                <a href="https://github.com/magicorntech/magiclens/releases">{t.all}</a>
                · <a href="mailto:support@magicorn.co">support@magicorn.co</a>
              </p>
            </div>
          </section>
        </main>

        <footer>
          <div className="wrap foot">
            <div>© Magicorn · MagicLens</div>
            <div className="foot-links">
              <a href={RELEASES}>{t.download}</a>
              <a href="mailto:support@magicorn.co">{t.support}</a>
              <a href="https://github.com/magicorntech/magiclens/releases">GitHub</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
