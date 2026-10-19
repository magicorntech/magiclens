import { useState } from 'react'
import type { ClusterAppKind } from '@shared/types/clusterApps'

// Demo-mode stand-ins for the embedded web UIs. Drop cropped captures (page content only, no app
// chrome) into assets/demo as <name>.page.png; missing files simply render an empty frame.
const images = import.meta.glob('../../assets/demo/*.page.png', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>

function image(name: string): string | undefined {
  return Object.entries(images).find(([path]) => path.endsWith(`/${name}.page.png`))?.[1]
}

export function DemoAppFrame({ kind }: { kind: ClusterAppKind }): React.JSX.Element {
  // Grafana starts on its login page; clicking it signs in, like the real thing.
  const [signedIn, setSignedIn] = useState(false)
  const src =
    kind === 'grafana'
      ? image(signedIn ? 'grafana-dashboard' : 'grafana-login')
      : kind === 'argocd'
        ? image('argocd-login')
        : image('prometheus')
  if (!src) return <div className="ml-cluster-app__demo ml-cluster-app__demo--empty" />
  return (
    <div className="ml-cluster-app__demo">
      <img
        src={src}
        alt=""
        draggable={false}
        onClick={kind === 'grafana' ? () => setSignedIn((v) => !v) : undefined}
        style={kind === 'grafana' ? { cursor: 'pointer' } : undefined}
      />
    </div>
  )
}
