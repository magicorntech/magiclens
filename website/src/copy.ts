export interface ThemeDef {
  id: string
  name: string
  group: 'base' | 'classic' | 'worlds'
  accent: string
  accent2: string
}

export const THEMES: ThemeDef[] = [
  { id: 'white', name: 'White', group: 'base', accent: '#171717', accent2: '#f5f5f7' },
  { id: 'black', name: 'Black', group: 'base', accent: '#ffffff', accent2: '#0a0a0a' },
  { id: 'violet', name: 'Violet', group: 'classic', accent: '#6d28d9', accent2: '#c4b5fd' },
  { id: 'ocean', name: 'Ocean', group: 'classic', accent: '#0e7490', accent2: '#22d3ee' },
  { id: 'forest', name: 'Forest', group: 'classic', accent: '#15803d', accent2: '#4ade80' },
  { id: 'sunset', name: 'Sunset', group: 'classic', accent: '#ea580c', accent2: '#fb923c' }
]

/** Gallery pages: `id` is the still's file name (a `-dark` twin exists for each). */
export const PAGES = [
  { id: 'deployments', label: 'Deployments' },
  { id: 'pods', label: 'Pods' },
  { id: 'services', label: 'Services' },
  { id: 'ingresses', label: 'Ingresses' },
  { id: 'topology', label: 'Topology' },
  { id: 'visualizer', label: 'Visualizer' },
  { id: 'helm', label: 'Helm charts' },
  { id: 'helm-releases', label: 'Helm releases' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'argocd-web', label: 'Argo CD' },
  { id: 'grafana-login', label: 'Grafana' },
  { id: 'prometheus', label: 'Prometheus' }
]

export const MOSAIC = [
  { id: 'feat-deployment-logs', caption: 'Merged deployment logs' },
  { id: 'feat-topology-selected', caption: 'Topology with a selected pod' },
  { id: 'feat-nodes-inspector', caption: 'Node inspector' },
  { id: 'feat-security-results', caption: 'Security scan results' },
  { id: 'feat-molly-panel', caption: 'Molly beside the page' },
  { id: 'feat-vpn-connected', caption: 'Built-in VPN, connected' },
  { id: 'feat-pod-detail', caption: 'Pod detail' },
  { id: 'feat-network-ingress', caption: 'Ingress detail' }
]

export const COPY = {
  nav: { product: 'Product', themes: 'Themes', download: 'Download' },
  hero: {
    eyebrow: 'Native desktop · macOS, Windows, Linux',
    title: 'Kubernetes,',
    em: 'without the noise.',
    lede: 'Every cluster in one calm window — with Molly, an AI assistant that only ever reads, Sparks for runbooks and notes, and a VPN built right in.',
    cta: 'Get MagicLens',
    secondary: 'See it in motion'
  },
  facts: [
    ['6+', 'colour themes, light and dark'],
    ['30+', 'resource kinds, one interface'],
    ['3', 'VPN providers built in'],
    ['100%', 'read-only AI assistant']
  ] as Array<[string, string]>,
  featuresTitle: 'Built to move at the speed of an incident.',
  themes: {
    kicker: 'Themes',
    title: 'Colour themes for every mood. Light and dark.',
    copy: 'From pure White and OLED Black to Violet, Ocean, Forest and Sunset — plus your own custom themes. Pick one; this page follows along.',
    light: 'Light',
    dark: 'Dark',
    views: ['Pods', 'Topology']
  },
  pages: {
    kicker: 'Every page',
    title: 'Dozens of pages, drawn to the same standard.',
    copy: 'Tables, graphs, timelines and the web tools you already use share one visual language — and every one comes in light and dark.',
    light: 'Light',
    dark: 'Dark',
    open: 'Open full size'
  },
  mosaic: { kicker: 'In detail', title: 'Small things, done properly.' },
  download: {
    title: 'Download MagicLens',
    copy: 'Signed and notarized installers. Updates arrive automatically.',
    mac: 'macOS',
    win: 'Windows',
    linux: 'Linux',
    note: 'Intel and Apple Silicon · Windows 10+ · AppImage and .deb'
  },
  footer: { text: 'MagicLens is built by', team: 'Magicorn', note: 'Screens show demo data.' },
  close: 'Close'
}
