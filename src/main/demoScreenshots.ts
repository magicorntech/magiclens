import { mkdir, writeFile } from 'node:fs/promises'
import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { app, screen, type BrowserWindow, type NativeImage } from 'electron'

/**
 * Marketing capture harness (demo mode only).
 *
 *   MAGICLENS_DEMO=1 MAGICLENS_SCREENSHOTS=1 npm run dev
 *
 * Output goes to MAGICLENS_SCREENSHOT_DIR (default docs/screenshots):
 *   png/<name>[-dark].png     4K (3840x2160) stills — page stills plus `shot` steps taken inside scenes
 *   video/<scene>[-dark].mov  4K real-time recordings (hardware HEVC), no cursor
 * `scripts/encode-demo-media.mjs` turns those into AVIF / AV1 / H.264 for the website.
 *
 * Knobs: MAGICLENS_CAPTURE=stills|themes|video|all (default all), MAGICLENS_SCENES=tour,molly (filter),
 * MAGICLENS_VARIANT=light|dark (White on white / Black on black; dark output gets a -dark suffix),
 * MAGICLENS_FFMPEG=/path/to/ffmpeg (required for video).
 */

const WIDTH = 1920
const HEIGHT = 1080
const FPS = 30

/** Must run before app ready: render at 2x so a 1920x1080 window yields true 4K pixels on any display. */
export function applyDemoCaptureSwitches(): void {
  if (process.env.MAGICLENS_SCREENSHOTS !== '1') return
  app.commandLine.appendSwitch('force-device-scale-factor', '2')
  app.commandLine.appendSwitch('disable-renderer-backgrounding')
  app.commandLine.appendSwitch('disable-background-timer-throttling')
}

const VARIANT = process.env.MAGICLENS_VARIANT === 'dark' ? 'dark' : 'light'
const SUFFIX = VARIANT === 'dark' ? '-dark' : ''

// ---------------------------------------------------------------------------------------------
// Stills (no Overview pages anywhere: tables, details, graphs and web UIs only)
// ---------------------------------------------------------------------------------------------

const PAGES: Array<{ name: string; target: string }> = [
  { name: 'pods', target: 'Pods' },
  { name: 'deployments', target: 'Deployments' },
  { name: 'services', target: 'Services' },
  { name: 'ingresses', target: 'Ingresses' },
  { name: 'topology', target: 'topology' },
  { name: 'visualizer', target: 'visualizer' },
  { name: 'helm', target: 'helmCharts' },
  { name: 'helm-releases', target: 'helmReleases' },
  { name: 'timeline', target: 'eventTimeline' },
  { name: 'argocd-web', target: 'appArgoCd' },
  { name: 'grafana-login', target: 'appGrafana' },
  { name: 'prometheus', target: 'appPrometheus' }
]

const THEME_IDS = ['white', 'black', 'violet', 'ocean', 'forest', 'sunset']

/** Same pages in every colour scheme, light and dark — feeds the website theme gallery. */
const THEME_STILLS = THEME_IDS.flatMap((id) =>
  (['light', 'dark'] as const).flatMap((mode) => [
    { file: `theme-${id}-${mode}.png`, target: `theme:${id}:${mode}:Pods` },
    { file: `theme-${id}-${mode}-topology.png`, target: `theme:${id}:${mode}:topology` }
  ])
)

const STILLS = PAGES.map((p) => ({ file: `${p.name}${SUFFIX}.png`, target: p.target }))

// ---------------------------------------------------------------------------------------------
// Scenes: scripted walkthroughs recorded as video. No cursor and no click markers are drawn, so
// navigation can run as fast as a person who knows the app.
// ---------------------------------------------------------------------------------------------

type Step =
  | { wait: number }
  /** Run JS in the page, then wait. */
  | { eval: string; wait?: number }
  /** `window.__mlDemoShot(target)`: open a page. */
  | { page: string; wait?: number }
  /** `window.__mlDemoCmd(cmd)`: scripted UI state (see demoShot.ts). */
  | { cmd: string; wait?: number }
  /** Click an element found by visible text and/or CSS selector. */
  | { click: string; sel?: string; nth?: number; wait?: number }
  /** Click a button inside the container (`box` selector) whose text starts with `within`. */
  | { clickIn: string; box: string; button: string; wait?: number }
  | { type: string; delay?: number }
  | { key: 'Enter' | 'Escape' | 'Tab'; wait?: number }
  /** Press on an element, drag it by (dx, dy), release. */
  | { drag: string; sel?: string; nth?: number; dx: number; dy?: number; wait?: number }
  | { scroll: number; at?: string; sel?: string; wait?: number }
  /** Save a 4K still of the current screen as png/<name>.png. */
  | { shot: string; wait?: number }

const NAV = '.ml-resource-nav-item-label'
const GROUP = '.ml-resource-nav-group-head'
const DTAB = '.ant-tabs-tab-btn'
const BTAB = '.ml-browser-tab'
const ROW = 'td'
const SWATCH = '.ml-settings-swatch'

const THEME_CYCLE: Array<[string, 'light' | 'dark']> = [
  ['white', 'light'],
  ['black', 'dark'],
  ['violet', 'light'],
  ['violet', 'dark'],
  ['ocean', 'light'],
  ['ocean', 'dark'],
  ['forest', 'light'],
  ['sunset', 'dark'],
  ['rose', 'light'],
  ['slate', 'dark'],
  ['nebula', 'dark'],
  ['moonprism', 'light']
]

const SCENES: Record<string, Step[]> = {
  // Everything is one click away: pages, groups and five clusters, at the pace of someone who knows the app.
  tour: [
    { cmd: 'resetTabs:', wait: 400 },
    { page: 'Pods', wait: 1200 },
    { page: 'Deployments', wait: 1100 },
    { page: 'topology', wait: 1900 },
    { page: 'visualizer', wait: 1900 },
    { click: 'Network', sel: GROUP, wait: 500 },
    { click: 'Services', sel: NAV, wait: 1100 },
    { click: 'Ingresses', sel: NAV, wait: 1100 },
    { page: 'eventTimeline', wait: 1500 },
    { page: 'helmCharts', wait: 1500 },
    { click: 'aurora-staging', wait: 900 },
    { page: 'Deployments', wait: 1100 },
    { page: 'topology', wait: 1700 },
    { click: 'aurora-test', wait: 900 },
    { page: 'Pods', wait: 1100 },
    { page: 'visualizer', wait: 1700 },
    { click: 'payments-prod', wait: 1300 },
    { page: 'Deployments', wait: 1100 },
    { page: 'eventTimeline', wait: 1400 },
    { click: 'platform-prod', wait: 1300 },
    { page: 'Pods', wait: 1100 },
    { page: 'topology', wait: 1700 },
    { click: 'aurora-prod', wait: 1000 },
    { page: 'Deployments', wait: 1000 }
  ],

  // Two clusters in one window, each pane with its own menu.
  'split-clusters': [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Pods', wait: 1800 },
    { click: 'Split screen', wait: 2200 },
    { click: 'Topology', sel: NAV, nth: 0, wait: 2200 },
    { click: 'Pods', sel: NAV, nth: 1, wait: 1800 },
    { click: 'Deployments', sel: NAV, nth: 1, wait: 1800 },
    { click: 'Visualizer', sel: NAV, nth: 0, wait: 2200 },
    { click: 'Timeline', sel: NAV, nth: 1, wait: 2200 },
    { shot: 'feat-split-clusters' },
    { click: 'aurora-test', wait: 1800 },
    { click: 'Pods', sel: NAV, nth: 0, wait: 1800 },
    { click: 'Exit split view', wait: 2000 }
  ],

  // Split inside one cluster: two resource windows next to each other.
  'split-inner': [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Pods', wait: 1500 },
    { cmd: 'innerSplit:Pods,Deployments', wait: 2600 },
    { shot: 'feat-split-inner' },
    { click: 'storefront', sel: ROW, nth: 1, wait: 2200 },
    { key: 'Escape', wait: 1000 },
    { cmd: 'innerSplit:Deployments,Events', wait: 2600 },
    { shot: 'feat-split-inner-events' },
    { cmd: 'innerSplit:Services,Pods', wait: 2600 },
    { cmd: 'innerSplit:off', wait: 1800 }
  ],

  // Every collapsible part of the chrome: workspaces, favourites, resource groups, the menu, the sidebar.
  'sidebar-collapse': [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Pods', wait: 1800 },
    { click: 'Workloads', sel: GROUP, wait: 900 },
    { click: 'Config', sel: GROUP, wait: 900 },
    { click: 'Network', sel: GROUP, wait: 900 },
    { click: 'Config', sel: GROUP, wait: 900 },
    { click: 'Network', sel: GROUP, wait: 900 },
    { click: 'Workloads', sel: GROUP, wait: 1100 },
    { click: 'Aurora', sel: '.ml-sidebar-workspace-head, .ml-sidebar-group-head, span', wait: 1100 },
    { click: 'Aurora', sel: '.ml-sidebar-workspace-head, .ml-sidebar-group-head, span', wait: 1100 },
    { click: 'FAVORITES', wait: 1300 },
    { shot: 'feat-favorites-open' },
    { click: 'FAVORITES', wait: 1100 },
    { cmd: 'menu:collapsed', wait: 1800 },
    { shot: 'feat-menu-collapsed' },
    { cmd: 'menu:expanded', wait: 1500 },
    { click: 'Collapse sidebar', wait: 2000 },
    { shot: 'feat-sidebar-collapsed' },
    { click: 'Expand sidebar', wait: 1500 }
  ],

  // Open a detail panel, drag its edge wider and narrower.
  'detail-resize': [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Deployments', wait: 2200 },
    { click: 'checkout-api', sel: ROW, wait: 1800 },
    { drag: '', sel: '.ml-detail-resize-handle', dx: -560, wait: 1800 },
    { click: 'Pods', sel: DTAB, wait: 1600 },
    { click: 'Logs', sel: DTAB, wait: 2400 },
    { drag: '', sel: '.ml-detail-resize-handle', dx: 700, wait: 1800 }
  ],

  // Nodes (staging): the node list, then a node's inspector — no overview cards.
  'nodes-deep': [
    { cmd: 'resetTabs:', wait: 300 },
    { click: 'aurora-staging', wait: 900 },
    { page: 'Nodes', wait: 1500 },
    // Bring the node table to the top so the Nodes page shows the list, not its summary cards.
    { eval: `(() => { const t = document.querySelector('.ant-table-wrapper'); let p = t; while (p && p.scrollHeight <= p.clientHeight + 2) p = p.parentElement; if (!p) return false; p.scrollTop = t.getBoundingClientRect().top - p.getBoundingClientRect().top + p.scrollTop - 10; return true })()`, wait: 1200 },
    { shot: 'feat-nodes-table' },
    { click: 'aurora-pool-a-1', sel: ROW, wait: 2200 },
    { shot: 'feat-nodes-inspector', wait: 600 },
    { click: 'Metrics', sel: DTAB, wait: 2200 },
    { shot: 'feat-nodes-metrics' },
    { key: 'Escape', wait: 800 }
  ],

  // Deployments (prod): detail, scale dialog, pods, merged logs, events.
  'deployment-deep': [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Deployments', wait: 2200 },
    { shot: 'feat-deployments-table' },
    { click: 'storefront', sel: ROW, wait: 2000 },
    { shot: 'feat-deployment-detail' },
    { click: 'Scale replicas', wait: 1600 },
    { shot: 'feat-deployment-scale', wait: 400 },
    { key: 'Escape', wait: 700 },
    { click: 'Pods', sel: DTAB, wait: 1700 },
    { click: 'Logs', sel: DTAB, wait: 3200 },
    { shot: 'feat-deployment-logs' },
    { scroll: 500, at: '.ant-tabs-content-holder', wait: 1200 },
    { click: 'Events', sel: DTAB, wait: 1700 },
    { shot: 'feat-deployment-events' }
  ],

  // Pods (test cluster): table, a pod's overview and logs.
  'pods-deep': [
    { cmd: 'resetTabs:', wait: 300 },
    { click: 'aurora-test', wait: 900 },
    { page: 'Pods', wait: 2200 },
    { shot: 'feat-pods-table' },
    { click: 'checkout-api-7f8d9c-b3k', sel: ROW, wait: 2000 },
    { shot: 'feat-pod-detail' },
    { click: 'Logs', sel: DTAB, wait: 2600 },
    { shot: 'feat-pod-logs' }
  ],

  // Network (payments-prod): services, an ingress.
  'network-deep': [
    { cmd: 'resetTabs:', wait: 300 },
    { click: 'payments-prod', wait: 1500 },
    { page: 'Services', wait: 2200 },
    { shot: 'feat-network-services' },
    { click: 'storefront', sel: ROW, wait: 2000 },
    { shot: 'feat-network-service-detail' },
    { key: 'Escape', wait: 700 },
    { page: 'Ingresses', wait: 2000 },
    { click: 'storefront', sel: ROW, wait: 2000 },
    { shot: 'feat-network-ingress' }
  ],

  // Topology (prod): graph, selection, applications, resources.
  'topology-deep': [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'topology', wait: 4500 },
    { shot: 'feat-topology-graph' },
    { click: 'storefront-7f8d9c-e6k', wait: 2200 },
    { shot: 'feat-topology-selected' },
    { key: 'Escape', wait: 900 },
    { click: 'Applications', wait: 2400 },
    { shot: 'feat-topology-apps' },
    { click: 'Resources', wait: 2400 },
    { shot: 'feat-topology-resources' }
  ],

  // Visualizer (test cluster): namespace map.
  'visualizer-deep': [
    { cmd: 'resetTabs:', wait: 300 },
    { click: 'aurora-test', wait: 900 },
    { page: 'visualizer', wait: 4500 },
    { shot: 'feat-visualizer-map' }
  ],

  // Security (platform-prod): the last scan, a fresh scan running, results and a finding's detail drawer.
  'security-deep': [
    { cmd: 'resetTabs:', wait: 300 },
    { click: 'platform-prod', wait: 1500 },
    { page: 'security', wait: 2400 },
    { shot: 'feat-security-results' },
    { click: 'Scan', sel: 'button', wait: 1800 },
    { shot: 'feat-security-intro' },
    { click: 'Scan', sel: '.ant-modal button', wait: 3000 },
    { shot: 'feat-security-scanning' },
    { wait: 6500 },
    { click: '', sel: 'tbody tr.ant-table-row, tbody tr', nth: 1, wait: 2200 },
    { shot: 'feat-security-finding' }
  ],

  // Molly answers in chat, calling read-only tools against the demo cluster.
  molly: [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Pods', wait: 1800 },
    { click: 'Molly', nth: 1, wait: 1500 },
    { click: 'New chat', wait: 500 },
    { click: 'Ask Molly', wait: 400 },
    { type: "What's wrong with aurora-prod?", delay: 45 },
    { key: 'Enter', wait: 7000 },
    { shot: 'feat-molly-health' },
    { click: 'Ask Molly', wait: 400 },
    { type: 'Show warning events from the last hour', delay: 45 },
    { key: 'Enter', wait: 7000 },
    { shot: 'feat-molly-events' },
    { click: 'Ask Molly', wait: 400 },
    { type: 'Show me the busiest nodes', delay: 45 },
    { key: 'Enter', wait: 8000 },
    { shot: 'feat-molly-nodes' }
  ],

  // Molly beside the page you are looking at, plus her settings.
  'molly-panel': [
    { cmd: 'resetTabs:', wait: 300 },
    { click: 'aurora-staging', wait: 900 },
    { page: 'Pods', wait: 2000 },
    { eval: `window.useAiPanelOpen()`, wait: 1800 },
    { click: 'Explain this page', wait: 6500 },
    { shot: 'feat-molly-panel' },
    { click: 'Ask about this cluster', sel: 'textarea', wait: 400 },
    { type: 'Which pods keep restarting?', delay: 45 },
    { key: 'Enter', wait: 7000 },
    { shot: 'feat-molly-panel-events' }
  ],
  'molly-settings': [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Pods', wait: 1500 },
    { click: 'Molly', nth: 1, wait: 1800 },
    { shot: 'feat-molly-hub' },
    { click: 'AI settings', wait: 1800 },
    { shot: 'feat-ai-settings', wait: 600 },
    { key: 'Escape', wait: 800 },
    { click: 'Preferences', wait: 1800 },
    { shot: 'feat-molly-preferences', wait: 600 }
  ],

  // Sparks: notebook with linked notes, split editor + graph, reminders.
  sparks: [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Pods', wait: 1500 },
    { cmd: 'notes:paper=plain' },
    { cmd: 'notes:mode=preview' },
    { click: 'Sparks', wait: 2200 },
    { click: 'Start Here', wait: 2000 },
    { shot: 'feat-sparks-start' },
    { click: 'Rollout Runbook', wait: 2200 },
    { shot: 'feat-sparks-runbook' },
    { click: 'Incident 2026-10-12 image-resizer', wait: 2200 },
    { shot: 'feat-sparks-incident' },
    { click: 'Node pool sizing', wait: 2000 },
    { shot: 'feat-sparks-sizing' },
    { cmd: 'notes:split=editor-graph', wait: 3200 },
    { shot: 'feat-sparks-split-graph' }
  ],

  // The Sparks map comes alive: nodes dragged around, panned, zoomed with the wheel, a note opened from it.
  'sparks-graph': [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Pods', wait: 1200 },
    { cmd: 'notes:paper=plain' },
    { cmd: 'notes:mode=preview' },
    { click: 'Sparks', wait: 2200 },
    { click: '', sel: '.ml-vault-chip--icon', nth: 0, wait: 2600 },
    { shot: 'feat-sparks-graph' },
    { drag: '', sel: '.react-flow__node', nth: 3, dx: 220, dy: -120, wait: 900 },
    { drag: '', sel: '.react-flow__node', nth: 6, dx: -260, dy: 140, wait: 900 },
    { drag: '', sel: '.react-flow__node', nth: 9, dx: 180, dy: 160, wait: 900 },
    { scroll: -420, at: '.react-flow__pane', wait: 1000 },
    { drag: '', sel: '.react-flow__pane', dx: -240, dy: 90, wait: 1000 },
    { shot: 'feat-sparks-graph-zoom' },
    { scroll: 420, at: '.react-flow__pane', wait: 1200 },
    { click: 'Rollout Runbook', sel: '.react-flow__node', wait: 2400 }
  ],

  // A note attached to the deployment it is about.
  'sparks-attached': [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Deployments', wait: 2200 },
    { click: 'image-resizer', sel: ROW, wait: 2000 },
    { click: 'Sparks', sel: DTAB, wait: 2200 },
    { shot: 'feat-sparks-attached' }
  ],

  // Built-in VPN: profiles, one-click WireGuard, PIN + MFA for Pritunl, two tunnels at once, per-cluster badges.
  vpn: [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Pods', wait: 1800 },
    { click: 'FAVORITES', wait: 900 },
    { shot: 'feat-vpn-badge' },
    { click: 'FAVORITES', wait: 600 },
    { cmd: 'view:vpn', wait: 2400 },
    { clickIn: 'EKS bastion', box: '.ml-vpn-profile-card', button: 'Disconnect', wait: 1500 },
    { shot: 'feat-vpn-profiles' },
    { clickIn: 'EKS bastion', box: '.ml-vpn-profile-card', button: 'Connect', wait: 1000 },
    { shot: 'feat-vpn-connecting' },
    { wait: 3600 },
    { shot: 'feat-vpn-connected' },
    { clickIn: 'Aurora Corp', box: '.ml-vpn-profile-card', button: 'Connect', wait: 1600 },
    { shot: 'feat-vpn-mfa' },
    { click: 'VPN PIN', wait: 300 },
    { type: '4821', delay: 90 },
    { click: '6-digit code', wait: 300 },
    { type: '190233', delay: 90 },
    { shot: 'feat-vpn-credentials' },
    { click: 'Connect', sel: '.ant-modal button.ant-btn-primary', wait: 5000 },
    { shot: 'feat-vpn-multi' },
    { wait: 2500 },
    { clickIn: 'Aurora Corp', box: '.ml-vpn-profile-card', button: 'Disconnect', wait: 2200 },
    { clickIn: 'EKS bastion', box: '.ml-vpn-profile-card', button: 'Disconnect', wait: 2200 }
  ],

  // The same page in twelve colour/mode combinations, then the real Appearance settings.
  themes: [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'Deployments', wait: 1800 },
    { click: 'checkout-api', sel: ROW, wait: 1500 },
    ...THEME_CYCLE.map(([id, mode]): Step => ({ cmd: `theme:${id}/${mode}`, wait: 1300 })),
    { cmd: 'theme:white/light', wait: 900 },
    { key: 'Escape', wait: 600 },
    { cmd: 'settings:appearance', wait: 1800 },
    { click: 'Violet', sel: SWATCH, wait: 1100 },
    { click: 'Ocean', sel: SWATCH, wait: 1100 },
    { click: 'Forest', sel: SWATCH, wait: 1100 },
    { click: 'Sunset', sel: SWATCH, wait: 1100 },
    { click: 'Dark', sel: '.ant-segmented-item', wait: 1500 },
    { click: 'Nebula', sel: SWATCH, wait: 1100 },
    { click: 'Black', sel: SWATCH, wait: 1100 },
    { click: 'Light', sel: '.ant-segmented-item', wait: 1500 },
    { click: 'White', sel: SWATCH, wait: 1300 }
  ],

  // Argo CD, Grafana and Prometheus live inside the app (demo shows their login/landing pages).
  webapps: [
    { cmd: 'resetTabs:', wait: 300 },
    { page: 'appArgoCd', wait: 2600 },
    { shot: 'feat-webapp-argocd' },
    { page: 'appGrafana', wait: 2400 },
    { shot: 'feat-webapp-grafana-login' },
    { click: '', sel: '.ml-cluster-app__demo img', wait: 2600 },
    { shot: 'feat-webapp-grafana' },
    { page: 'appPrometheus', wait: 2600 },
    { shot: 'feat-webapp-prometheus' }
  ]
}

// Injected once: element finder (the OS cursor is not part of captured frames, so nothing is drawn).
const PAGE_HELPERS = `
(() => {
  if (window.__mlFind) return
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    return r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth
  }
  const label = (el) => (el.innerText || el.getAttribute('aria-label') || el.placeholder || '').trim()
  window.__mlFind = (text, sel, nth) => {
    const all = [...document.querySelectorAll(sel || '*')].filter(visible)
    const inner = (el, t) => !!sel || ![...el.children].some((c) => label(c) === t && visible(c))
    const exact = all.filter((el) => text && label(el) === text && inner(el, text))
    const prefix = all.filter((el) => text && !exact.includes(el) && label(el).startsWith(text) && label(el).length < text.length + 24 && inner(el, label(el)))
    const el = (text ? [...exact, ...prefix] : all)[nth || 0]
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + Math.min(r.width / 2, 120), y: r.top + r.height / 2, tag: el.tagName + '.' + String(el.className).slice(0, 60) }
  }
  window.__mlFindIn = (boxSel, boxText, btnText) => {
    const box = [...document.querySelectorAll(boxSel)].filter(visible).find((b) => label(b).includes(boxText))
    if (!box) return null
    const btn = [...box.querySelectorAll('button')].filter(visible).find((b) => label(b) === btnText)
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, tag: 'BUTTON ' + btnText }
  }
  window.useAiPanelOpen = () => {
    // The Molly panel toggle sits in the top bar; click it by its aria-label.
    const btn = [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === 'Molly')
    if (btn) btn.click()
  }
  // A permanently animating pixel keeps the compositor producing frames even when the UI is idle.
  const pulse = document.createElement('div')
  pulse.style.cssText = 'position:fixed;right:0;bottom:0;width:2px;height:2px;z-index:2147483647;pointer-events:none;animation:__mlpulse 0.5s linear infinite alternate'
  const css = document.createElement('style')
  css.textContent = '@keyframes __mlpulse{from{opacity:.02}to{opacity:.04}}'
  document.head.append(css)
  document.body.append(pulse)
})()
`

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class Recorder {
  private ff: ChildProcess | null = null
  private last = 0
  private ready = true

  constructor(
    private readonly window: BrowserWindow,
    private readonly ffmpeg: string,
    private readonly out: string
  ) {}

  start(width: number, height: number): void {
    this.ff = spawn(
      this.ffmpeg,
      [
        '-y', '-loglevel', 'error',
        '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', `${width}x${height}`,
        '-use_wallclock_as_timestamps', '1', '-i', 'pipe:0',
        '-vf', `fps=${FPS},format=yuv420p`,
        '-c:v', 'hevc_videotoolbox', '-b:v', '90M', '-tag:v', 'hvc1', '-an', this.out
      ],
      { stdio: ['pipe', 'inherit', 'inherit'] }
    )
    this.ff.stdin?.on('drain', () => { this.ready = true })
    this.ff.stdin?.on('error', () => undefined)
    this.window.webContents.beginFrameSubscription(false, (image: NativeImage) => {
      const now = Date.now()
      if (!this.ready || now - this.last < 1000 / FPS - 4) return
      this.last = now
      const ok = this.ff?.stdin?.write(image.toBitmap())
      if (ok === false) this.ready = false
    })
  }

  async stop(): Promise<void> {
    this.window.webContents.endFrameSubscription()
    const ff = this.ff
    if (!ff) return
    ff.stdin?.end()
    await new Promise<void>((resolve) => ff.once('close', () => resolve()))
  }
}

type Point = { x: number; y: number; tag?: string }

async function runStep(window: BrowserWindow, step: Step, dest: string): Promise<void> {
  const wc = window.webContents
  const find = async (text: string, sel?: string, nth = 0): Promise<Point | null> =>
    (await wc.executeJavaScript(
      `window.__mlFind(${JSON.stringify(text)}, ${JSON.stringify(sel ?? null)}, ${nth})`
    )) as Point | null

  const press = async (pt: Point, wait: number | undefined): Promise<void> => {
    const x = Math.round(pt.x)
    const y = Math.round(pt.y)
    wc.sendInputEvent({ type: 'mouseMove', x, y })
    await sleep(60)
    wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 })
    await sleep(50)
    wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 })
    // Park the pointer on empty title-bar space so tooltips and hover states do not linger.
    await sleep(120)
    wc.sendInputEvent({ type: 'mouseMove', x: 110, y: 900 })
    await sleep(wait ?? 600)
  }

  if ('page' in step) {
    await wc.executeJavaScript(`window.__mlDemoShot(${JSON.stringify(step.page)})`)
    return sleep(step.wait ?? 0)
  }
  if ('cmd' in step) {
    await wc.executeJavaScript(`window.__mlDemoCmd(${JSON.stringify(step.cmd)})`)
    return sleep(step.wait ?? 400)
  }
  if ('eval' in step) {
    const out = await wc.executeJavaScript(step.eval)
    if (out !== undefined && out !== null) console.log('[demo-capture] eval =>', JSON.stringify(out))
    return sleep(step.wait ?? 0)
  }
  if ('shot' in step) {
    await sleep(250)
    const image = await wc.capturePage()
    await writeFile(join(dest, 'png', `${step.shot}${SUFFIX}.png`), image.toPNG())
    console.log(`[demo-capture] shot ${step.shot}${SUFFIX} ${image.getSize().width}x${image.getSize().height}`)
    return sleep(step.wait ?? 0)
  }
  if ('clickIn' in step) {
    const pt = (await wc.executeJavaScript(
      `window.__mlFindIn(${JSON.stringify(step.box)}, ${JSON.stringify(step.clickIn)}, ${JSON.stringify(step.button)})`
    )) as Point | null
    if (!pt) {
      console.warn(`[demo-capture] not found: ${step.button} in ${step.clickIn} (${step.box})`)
      return sleep(300)
    }
    console.log(`[demo-capture] -> ${step.button} in ${step.clickIn}`)
    return press(pt, step.wait)
  }
  if ('click' in step) {
    const pt = await find(step.click, step.sel, step.nth)
    if (!pt) {
      console.warn(`[demo-capture] not found: ${step.click} (${step.sel ?? '*'})`)
      console.warn(
        '[demo-capture] labels:',
        await wc.executeJavaScript(
          `[...new Set([...document.querySelectorAll('button,[role=button],[aria-label],a')].map((e) => (e.getAttribute('aria-label') || e.innerText || '').trim()).filter(Boolean))].slice(0, 60).join(' | ')`
        )
      )
      return sleep(400)
    }
    console.log(`[demo-capture] -> ${step.click} @ ${pt.tag}`)
    return press(pt, step.wait)
  }
  if ('drag' in step) {
    const pt = await find(step.drag, step.sel, step.nth)
    if (!pt) {
      console.warn(`[demo-capture] drag target not found: ${step.drag} (${step.sel ?? '*'})`)
      return sleep(400)
    }
    const x = Math.round(pt.x)
    const y = Math.round(pt.y)
    wc.sendInputEvent({ type: 'mouseMove', x, y })
    await sleep(200)
    wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 })
    const n = 40
    for (let i = 1; i <= n; i++) {
      const t = i / n
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      wc.sendInputEvent({ type: 'mouseMove', x: Math.round(x + step.dx * e), y: Math.round(y + (step.dy ?? 0) * e), button: 'left', modifiers: ['leftbuttondown'] })
      await sleep(20)
    }
    wc.sendInputEvent({ type: 'mouseUp', x: Math.round(x + step.dx), y: Math.round(y + (step.dy ?? 0)), button: 'left', clickCount: 1 })
    await sleep(150)
    wc.sendInputEvent({ type: 'mouseMove', x: 110, y: 900 })
    return sleep(step.wait ?? 600)
  }
  if ('type' in step) {
    for (const ch of step.type) {
      wc.sendInputEvent({ type: 'char', keyCode: ch })
      await sleep(step.delay ?? 50)
    }
    return sleep(300)
  }
  if ('key' in step) {
    wc.sendInputEvent({ type: 'keyDown', keyCode: step.key })
    wc.sendInputEvent({ type: 'keyUp', keyCode: step.key })
    return sleep(step.wait ?? 300)
  }
  if ('scroll' in step) {
    const pt = (step.at ? await find('', step.at) : null) ?? { x: 1100, y: 600 }
    const dy = step.scroll
    for (let i = 0; i < 12; i++) {
      wc.sendInputEvent({ type: 'mouseWheel', x: Math.round(pt.x), y: Math.round(pt.y), deltaX: 0, deltaY: -dy / 12 })
      await sleep(40)
    }
    return sleep(step.wait ?? 0)
  }
  if ('wait' in step) return sleep(step.wait)
}

async function settle(window: BrowserWindow, extraMs: number): Promise<void> {
  // macOS can grow the window to the display's work area; keep it exactly 1920x1080 (3840x2160 px).
  const [w, h] = window.getContentSize()
  if (w !== WIDTH || h !== HEIGHT) {
    window.setContentSize(WIDTH, HEIGHT)
    await sleep(500)
  }
  await sleep(extraMs)
  // Two animation frames so React has committed and the compositor has painted.
  await window.webContents.executeJavaScript(
    'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120))))'
  )
  window.webContents.invalidate()
  await sleep(250)
}

export function scheduleDemoScreenshots(window: BrowserWindow): void {
  if (process.env.MAGICLENS_SCREENSHOTS !== '1') return
  const dest = process.env.MAGICLENS_SCREENSHOT_DIR || join(process.cwd(), 'docs/screenshots')
  const mode = process.env.MAGICLENS_CAPTURE || 'all'
  const only = (process.env.MAGICLENS_SCENES || '').split(',').filter(Boolean)
  const ffmpeg = process.env.MAGICLENS_FFMPEG

  window.webContents.once('did-finish-load', () => {
    void (async () => {
      await mkdir(join(dest, 'png'), { recursive: true })
      await mkdir(join(dest, 'video'), { recursive: true })
      window.webContents.setBackgroundThrottling(false)
      window.setAlwaysOnTop(true, 'screen-saver')
      window.setContentSize(WIDTH, HEIGHT)
      window.center()
      window.show()
      window.focus()
      await sleep(7000)
      console.log('[demo-capture] variant', VARIANT, 'content size', JSON.stringify(window.getContentSize()), 'display', JSON.stringify(screen.getPrimaryDisplay().workAreaSize))
      window.webContents.on('console-message', (_e, level, msg, line, src) => {
        if (level >= 2) console.log('[renderer]', msg.slice(0, 300), src.split('/').pop(), line)
      })
      await window.webContents.executeJavaScript(PAGE_HELPERS)
      await window.webContents.executeJavaScript(`window.__mlDemoCmd('variant:${VARIANT}')`)
      // Favourites start collapsed so the sidebar stays calm.
      await window.webContents.executeJavaScript(
        `document.querySelector('.ml-sidebar-section--favorites [aria-expanded="true"]')?.click()`
      )

      if (mode === 'all' || mode === 'stills' || mode === 'themes') {
        for (const shot of mode === 'themes' ? THEME_STILLS : STILLS) {
          // A clean tab bar: just the page being shown.
          await window.webContents.executeJavaScript(`window.__mlDemoCmd('resetTabs:')`)
          await window.webContents.executeJavaScript(`window.__mlDemoShot(${JSON.stringify(shot.target)})`)
          await settle(window, shot.target.includes('topology') || shot.target.includes('visualizer') ? 4500 : 3200)
          const image = await window.webContents.capturePage()
          await writeFile(join(dest, 'png', shot.file), image.toPNG())
          console.log(`[demo-capture] still ${shot.file} ${image.getSize().width}x${image.getSize().height}`)
        }
      }

      if ((mode === 'all' || mode === 'video') && ffmpeg) {
        for (const [name, steps] of Object.entries(SCENES)) {
          if (only.length && !only.includes(name)) continue
          window.setContentSize(WIDTH, HEIGHT)
          await sleep(400)
          const size = (await window.webContents.capturePage()).getSize()
          const rec = new Recorder(window, ffmpeg, join(dest, 'video', `${name}${SUFFIX}.mov`))
          await window.webContents.executeJavaScript(`window.__mlDemoCmd('variant:${VARIANT}')`)
          await window.webContents.executeJavaScript(`window.__mlDemoShot('Pods')`)
          await settle(window, 1800)
          rec.start(size.width, size.height)
          await sleep(500)
          for (const step of steps) await runStep(window, step, dest)
          await sleep(700)
          await rec.stop()
          console.log(`[demo-capture] scene ${name}${SUFFIX} recorded (${size.width}x${size.height})`)
        }
      } else if (mode === 'video' || mode === 'all') {
        console.warn('[demo-capture] MAGICLENS_FFMPEG not set — skipping video scenes')
      }
      console.log(`[demo-capture] done → ${dest}`)
      app.quit()
    })().catch((err) => {
      console.error('[demo-capture] failed', err)
      app.quit()
    })
  })
}
