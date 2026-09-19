import { useMemo, useState, type CSSProperties } from 'react'
import { CLUSTERS, type PageKey } from '../data'
import { SCHEMES, schemeVars, type SchemeId } from '../theme'
import { Shell } from './Shell'
import { ClustersSlice } from './ClustersSlice'
import { NodesSlice } from './NodesSlice'
import { PodsSlice } from './PodsSlice'
import { VisualizerSlice } from './VisualizerSlice'
import { TopologySlice } from './TopologySlice'
import { HelmSlice } from './HelmSlice'
import { StorageSlice } from './StorageSlice'
import { TimelineSlice } from './TimelineSlice'
import { IngressSlice } from './IngressSlice'
import { ArgoSlice } from './ArgoSlice'
import './live.css'

export type LiveMode =
  | 'app'
  | 'clusters'
  | 'nodes'
  | 'visualizer'
  | 'topology'
  | 'pods'
  | 'helm'
  | 'storage'
  | 'timeline'
  | 'ingress'
  | 'argocd'

const MODE_PAGE: Partial<Record<LiveMode, PageKey>> = {
  app: 'visualizer',
  nodes: 'nodes',
  visualizer: 'visualizer',
  topology: 'topology',
  pods: 'pods',
  helm: 'helm',
  storage: 'storage',
  timeline: 'timeline',
  ingress: 'ingress',
  argocd: 'argocd'
}

export function LiveApp({
  mode = 'app',
  tall,
  showThemeBar,
  lang
}: {
  mode?: LiveMode
  tall?: boolean
  showThemeBar?: boolean
  lang: 'en' | 'tr'
}) {
  const [dark, setDark] = useState(false)
  const [scheme, setScheme] = useState<SchemeId>('rose')
  const [split, setSplit] = useState(mode === 'app')
  const [focus, setFocus] = useState<'left' | 'right'>('left')
  const [clusterId, setClusterId] = useState('prod')
  const [rightClusterId, setRightClusterId] = useState('staging')
  const [page, setPage] = useState<PageKey>(MODE_PAGE[mode] ?? 'visualizer')

  const vars = useMemo(() => schemeVars(scheme, dark), [scheme, dark])
  const locked = mode !== 'app'
  const cluster = CLUSTERS.find((c) => c.id === clusterId) ?? CLUSTERS[0]

  if (mode === 'clusters') {
    return (
      <div className={`ml-live${tall ? ' ml-live--tall' : ''}`} style={vars as CSSProperties}>
        <ClustersSlice />
      </div>
    )
  }

  function workspace(p: PageKey) {
    if (p === 'nodes') return <NodesSlice />
    if (p === 'visualizer') return <VisualizerSlice clusterName={cluster.name} />
    if (p === 'topology') return <TopologySlice namespace={cluster.id === 'prod' ? 'payments' : 'shop'} />
    if (p === 'pods' || p === 'deployments' || p === 'logs') return <PodsSlice />
    if (p === 'helm') return <HelmSlice />
    if (p === 'storage') return <StorageSlice />
    if (p === 'timeline') return <TimelineSlice />
    if (p === 'ingress') return <IngressSlice />
    if (p === 'argocd') return <ArgoSlice />
    return <PodsSlice />
  }

  return (
    <div>
      {showThemeBar ? (
        <div className="ml-themebar">
          <button type="button" className={`ml-swatch${dark ? '' : ' is-on'}`} onClick={() => setDark(false)}>
            {lang === 'tr' ? 'Açık' : 'Light'}
          </button>
          <button type="button" className={`ml-swatch${dark ? ' is-on' : ''}`} onClick={() => setDark(true)}>
            {lang === 'tr' ? 'Koyu' : 'Dark'}
          </button>
          {SCHEMES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`ml-swatch${scheme === s.id ? ' is-on' : ''}`}
              onClick={() => setScheme(s.id)}
            >
              <i style={{ background: s.chip }} />
              {s.name}
            </button>
          ))}
        </div>
      ) : null}

      <Shell
        page={page}
        onPage={locked ? undefined : setPage}
        clusterId={clusterId}
        onCluster={(id) => {
          if (split && focus === 'right') setRightClusterId(id)
          else setClusterId(id)
        }}
        split={split}
        onSplit={locked ? undefined : () => setSplit((v) => !v)}
        rightClusterId={rightClusterId}
        focus={focus}
        onFocus={setFocus}
        style={vars as CSSProperties}
        tall={tall}
        openTabs={
          mode === 'app'
            ? ['visualizer', 'topology', 'pods']
            : [page, ...(page === 'pods' ? (['deployments'] as PageKey[]) : [])]
        }
        right={
          split ? (
            <TopologySlice namespace="shop" compact />
          ) : undefined
        }
      >
        {workspace(page)}
      </Shell>
    </div>
  )
}
