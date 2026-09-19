import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { promisify } from 'node:util'
import { net } from 'electron'
import type {
  HelmCatalogChart,
  HelmChartPackage,
  HelmChartVersion,
  HelmInstallRequest,
  HelmRelease,
  HelmReleaseDetail,
  HelmReleaseHistoryEntry
} from '@shared/types/helm'
import { BUILTIN_HELM_CHARTS, demoHelmCatalog } from '@shared/helmBuiltinCatalog'
import type { ClusterClients } from './clusterManager'

export { demoHelmCatalog }

const execFileAsync = promisify(execFile)
const AH = 'https://artifacthub.io/api/v1'
const AH_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

function helmPathEnv(): NodeJS.ProcessEnv {
  const extra = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/home/linuxbrew/.linuxbrew/bin',
    join(process.env.HOME || '', '.local/bin'),
    join(process.env.HOME || '', 'bin')
  ]
  const cache = join(tmpdir(), 'ml-helm-cache')
  return {
    ...process.env,
    PATH: [...extra, process.env.PATH || '/usr/bin:/bin'].join(delimiter),
    HELM_CACHE_HOME: process.env.HELM_CACHE_HOME || cache,
    HELM_CONFIG_HOME: process.env.HELM_CONFIG_HOME || join(tmpdir(), 'ml-helm-config'),
    HELM_DATA_HOME: process.env.HELM_DATA_HOME || join(tmpdir(), 'ml-helm-data')
  }
}

interface AhRepository {
  name?: string
  url?: string
  display_name?: string
}

interface AhSearchPackage {
  package_id?: string
  name?: string
  display_name?: string
  description?: string
  version?: string
  app_version?: string
  stars?: number
  official?: boolean
  logo_image_id?: string
  repository?: AhRepository
}

interface AhVersion {
  version?: string
  app_version?: string
}

interface AhLink {
  url?: string
  name?: string
}

interface AhPackage {
  package_id?: string
  name?: string
  display_name?: string
  description?: string
  version?: string
  app_version?: string
  readme?: string
  default_values?: string
  home_url?: string
  logo_image_id?: string
  available_versions?: AhVersion[]
  repository?: AhRepository
  links?: AhLink[]
}

function logoUrl(id?: string): string | null {
  return id ? `https://artifacthub.io/image/${id}` : null
}

function installCommand(repo: string, chart: string): string {
  return `helm install my-release ${repo}/${chart}`
}

function toCatalog(pkg: AhSearchPackage): HelmCatalogChart | null {
  const name = pkg.name
  const repoName = pkg.repository?.name
  const repoUrl = pkg.repository?.url
  if (!name || !repoName || !repoUrl) return null
  return {
    id: `${repoName}/${name}`,
    name,
    displayName: pkg.display_name || name,
    description: pkg.description ?? '',
    version: pkg.version ?? '',
    appVersion: pkg.app_version ?? '',
    repoName,
    repoUrl,
    logoUrl: logoUrl(pkg.logo_image_id),
    stars: pkg.stars ?? 0,
    official: Boolean(pkg.official),
    packageId: pkg.package_id
  }
}

async function nodeGet(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
  redirects = 0
): Promise<{ ok: boolean; status: number; text: string }> {
  return await new Promise((resolve, reject) => {
    const lib = url.startsWith('http://') ? http : https
    const req = lib.get(url, { headers, timeout: timeoutMs }, (res) => {
      const status = res.statusCode ?? 0
      const location = res.headers.location
      if (status >= 300 && status < 400 && location) {
        if (redirects >= 5) {
          reject(new Error('Artifact Hub too many redirects'))
          return
        }
        resolve(nodeGet(new URL(location, url).href, headers, timeoutMs, redirects + 1))
        res.resume()
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk as Buffer))
      res.on('end', () => {
        resolve({ ok: status >= 200 && status < 300, status, text: Buffer.concat(chunks).toString('utf8') })
      })
    })
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Artifact Hub timeout'))
    })
    req.on('error', reject)
  })
}

async function electronGet(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Artifact Hub timeout')), timeoutMs)
    void net
      .fetch(url, { headers })
      .then((response) => {
        clearTimeout(timer)
        resolve(response)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

async function ahFetch(path: string, timeoutMs: number, accept = 'application/json'): Promise<{ ok: boolean; status: number; text: string }> {
  const url = `${AH}${path}`
  const headers = { ...AH_HEADERS, Accept: accept }
  try {
    return await nodeGet(url, headers, timeoutMs)
  } catch (err) {
    try {
      return await electronGet(url, headers, timeoutMs)
    } catch {
      throw err
    }
  }
}

async function ahJson<T>(path: string, timeoutMs = 20000): Promise<T> {
  const res = await ahFetch(path, timeoutMs)
  if (!res.ok) throw new Error(`Artifact Hub HTTP ${res.status}`)
  const text = res.text.trim()
  if (!text || text.startsWith('<')) throw new Error('Artifact Hub returned HTML')
  return JSON.parse(text) as T
}

function looksLikeYamlError(text: string): boolean {
  const start = text.trimStart()
  if (start.startsWith('<!') || start.startsWith('<html')) return true
  if (start.startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as { message?: unknown; error?: unknown }
      return typeof parsed.message === 'string' || typeof parsed.error === 'string'
    } catch {
      return false
    }
  }
  return false
}

async function ahValuesYaml(packageId: string, version: string): Promise<string | null> {
  if (!packageId || !version) return null
  try {
    const res = await ahFetch(
      `/packages/${encodeURIComponent(packageId)}/${encodeURIComponent(version)}/values`,
      20000,
      'application/yaml'
    )
    const text = res.text.trim()
    if (!res.ok || !text || looksLikeYamlError(text)) return null
    return text
  } catch (err) {
    console.warn('[helm-catalog] values fetch failed', packageId, version, err)
    return null
  }
}

async function searchArtifactHub(query: string): Promise<HelmCatalogChart[]> {
  const q = query.trim()
  const params = new URLSearchParams({
    kind: '0',
    limit: '60',
    offset: '0',
    facets: 'false',
    deprecated: 'false',
    sort: q ? 'relevance' : 'stars'
  })
  if (q) params.set('ts_query_web', q)
  const data = await ahJson<{ packages?: AhSearchPackage[] }>(`/packages/search?${params.toString()}`, 10000)
  return (data.packages ?? []).map(toCatalog).filter((c): c is HelmCatalogChart => Boolean(c))
}

export async function searchHelmCatalog(query: string): Promise<HelmCatalogChart[]> {
  const local = demoHelmCatalog(query)
  let remote: HelmCatalogChart[] = []
  try {
    remote = await searchArtifactHub(query)
  } catch {
    remote = []
  }
  const byId = new Map<string, HelmCatalogChart>()
  for (const chart of [...remote, ...local]) {
    if (!byId.has(chart.id)) byId.set(chart.id, chart)
  }
  const merged = [...byId.values()]
  return merged.length > 0 ? merged : BUILTIN_HELM_CHARTS
}

function isStubReadme(readme: string): boolean {
  const text = readme.trim()
  return !text || (text.includes('helm install my-release ') && text.length < 900)
}

function isStubValues(values: string, chartName: string): boolean {
  const text = values.trim()
  return !text || text.startsWith(`# Default values for ${chartName}`)
}

function toPackage(pkg: AhPackage, chartName: string, repoName: string, fallback: HelmChartPackage): HelmChartPackage {
  const name = pkg.name ?? chartName
  const repo = pkg.repository?.name ?? repoName
  const resolvedVer = pkg.version ?? fallback.version
  const versions: HelmChartVersion[] = (pkg.available_versions ?? [])
    .map((v) => ({ version: v.version ?? '', appVersion: v.app_version ?? '' }))
    .filter((v) => v.version)
  if (resolvedVer && !versions.some((v) => v.version === resolvedVer)) {
    versions.unshift({ version: resolvedVer, appVersion: pkg.app_version ?? '' })
  }
  const sourceUrl =
    pkg.links?.find((link) => (link.name || '').toLowerCase() === 'source')?.url ?? pkg.home_url ?? null
  return {
    id: `${repo}/${name}@${resolvedVer}`,
    name,
    displayName: pkg.display_name || name,
    description: pkg.description ?? '',
    version: resolvedVer,
    appVersion: pkg.app_version ?? '',
    repoName: repo,
    repoUrl: pkg.repository?.url ?? fallback.repoUrl,
    logoUrl: logoUrl(pkg.logo_image_id) ?? fallback.logoUrl,
    homeUrl: pkg.home_url ?? sourceUrl,
    sourceUrl,
    readme: (pkg.readme ?? '').trim(),
    valuesYaml: (pkg.default_values ?? '').trim(),
    versions: versions.slice(0, 40),
    installCommand: installCommand(repo, name)
  }
}

async function fetchHubPackage(
  repoName: string,
  chartName: string,
  version?: string
): Promise<AhPackage | null> {
  const base = `/packages/helm/${encodeURIComponent(repoName)}/${encodeURIComponent(chartName)}`
  const paths = version ? [`${base}/${encodeURIComponent(version)}`, base] : [base]
  for (const path of paths) {
    try {
      return await ahJson<AhPackage>(path, 25000)
    } catch (err) {
      console.warn('[helm-catalog] package fetch failed', path, err)
    }
  }
  return null
}

export async function getHelmPackage(
  repoName: string,
  chartName: string,
  version?: string,
  repoUrlHint?: string,
  packageIdHint?: string
): Promise<HelmChartPackage> {
  const fallback = demoHelmPackage(repoName, chartName, version, repoUrlHint)
  const requestedVer = version || fallback.version

  const [hubPkg, valuesFromHint] = await Promise.all([
    fetchHubPackage(repoName, chartName, version),
    ahValuesYaml(packageIdHint || '', requestedVer)
  ])

  const base = hubPkg ? toPackage(hubPkg, chartName, repoName, fallback) : { ...fallback, readme: '', valuesYaml: '' }
  const packageId = hubPkg?.package_id || packageIdHint || ''
  const resolvedVer = base.version || requestedVer

  if (!base.valuesYaml && valuesFromHint) base.valuesYaml = valuesFromHint
  if (!base.valuesYaml && packageId) {
    const values = await ahValuesYaml(packageId, resolvedVer)
    if (values) base.valuesYaml = values
  }

  const needValues = isStubValues(base.valuesYaml, base.name)
  const needReadme = isStubReadme(base.readme)
  if (needValues || needReadme) {
    const repoUrl = base.repoUrl || repoUrlHint || fallback.repoUrl
    const [helmValues, helmReadme] = await Promise.all([
      needValues ? helmShow('values', chartName, repoUrl, resolvedVer) : Promise.resolve(null),
      needReadme ? helmShow('readme', chartName, repoUrl, resolvedVer) : Promise.resolve(null)
    ])
    if (helmValues) base.valuesYaml = helmValues
    if (helmReadme) base.readme = helmReadme
  }

  if (!base.valuesYaml.trim()) base.valuesYaml = fallback.valuesYaml
  if (!base.readme.trim()) base.readme = fallback.readme
  return base
}

let cachedHelmBin: string | null | undefined

async function findHelmBin(): Promise<string | null> {
  if (cachedHelmBin !== undefined) return cachedHelmBin
  const candidates = [
    process.env.HELM_BIN,
    '/opt/homebrew/bin/helm',
    '/usr/local/bin/helm',
    join(process.env.HOME || '', '.local/bin/helm')
  ].filter((p): p is string => Boolean(p))
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cachedHelmBin = candidate
      return candidate
    }
  }
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const { stdout } = await execFileAsync(cmd, ['helm'], { timeout: 4000, env: helmPathEnv() })
    const line = stdout.trim().split(/\r?\n/).find((s) => s.trim())
    cachedHelmBin = line || null
    return cachedHelmBin
  } catch {
    cachedHelmBin = null
    return null
  }
}

async function helmShow(
  field: 'values' | 'readme',
  chartName: string,
  repoUrl: string,
  version: string
): Promise<string | null> {
  if (!repoUrl) return null
  const helm = await findHelmBin()
  if (!helm) return null
  const env = helmPathEnv()
  const oci = repoUrl.startsWith('oci://')
  const chartRef = oci ? `${repoUrl.replace(/\/$/, '')}/${chartName}` : chartName
  const attempts = oci
    ? [
        ['show', field, chartRef, ...(version ? ['--version', version] : [])],
        ['show', field, chartRef]
      ]
    : [
        ['show', field, chartRef, '--repo', repoUrl, ...(version ? ['--version', version] : [])],
        ['show', field, chartRef, '--repo', repoUrl]
      ]
  for (const args of attempts) {
    try {
      const { stdout } = await execFileAsync(helm, args, {
        timeout: 45000,
        maxBuffer: 12 * 1024 * 1024,
        env
      })
      const text = stdout.trim()
      if (text) return text
    } catch (err) {
      console.warn('[helm-catalog] helm show failed', field, chartName, err)
    }
  }
  return null
}

export async function installHelmChart(
  clients: ClusterClients,
  req: Omit<HelmInstallRequest, 'clusterId'>
): Promise<string> {
  const helm = await findHelmBin()
  if (!helm) {
    throw new Error(
      `helm CLI not found on PATH. Install Helm, then run:\nhelm upgrade --install ${req.releaseName} ${req.chartName} --repo ${req.repoUrl} --version ${req.version} --namespace ${req.namespace} --create-namespace`
    )
  }

  const dir = await mkdtemp(join(tmpdir(), 'ml-helm-'))
  const kubeconfigPath = join(dir, 'kubeconfig')
  const valuesPath = join(dir, 'values.yaml')
  try {
    await writeFile(kubeconfigPath, clients.kc.exportConfig(), 'utf8')
    await writeFile(valuesPath, req.valuesYaml || '#\n', 'utf8')
    const args = [
      'upgrade',
      '--install',
      req.releaseName,
      req.chartName,
      '--repo',
      req.repoUrl,
      '--version',
      req.version,
      '--namespace',
      req.namespace,
      '--create-namespace',
      '-f',
      valuesPath,
      '--kubeconfig',
      kubeconfigPath,
      '--timeout',
      '3m'
    ]
    const context = clients.kc.getCurrentContext()
    if (context) args.push('--kube-context', context)
    const { stdout, stderr } = await execFileAsync(helm, args, {
      timeout: 180_000,
      maxBuffer: 8 * 1024 * 1024,
      env: helmPathEnv()
    })
    return [stdout, stderr].filter(Boolean).join('\n').trim() || 'Deployed'
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export function demoHelmPackage(
  repoName: string,
  chartName: string,
  version?: string,
  repoUrl?: string
): HelmChartPackage {
  const match = BUILTIN_HELM_CHARTS.find((c) => c.repoName === repoName && c.name === chartName)
  const chart = match ?? {
    ...BUILTIN_HELM_CHARTS[0],
    id: `${repoName}/${chartName}`,
    name: chartName,
    displayName: chartName,
    repoName,
    repoUrl: repoUrl || '',
    version: version || '',
    description: '',
    logoUrl: null
  }
  const ver = version || chart.version
  return {
    id: `${chart.repoName}/${chart.name}@${ver}`,
    name: chart.name,
    displayName: chart.displayName,
    description: chart.description,
    version: ver,
    appVersion: chart.appVersion,
    repoName: chart.repoName,
    repoUrl: repoUrl || chart.repoUrl,
    logoUrl: chart.logoUrl,
    homeUrl: null,
    sourceUrl: null,
    readme: `# ${chart.displayName}\n\n${chart.description}\n\n## Installation\n\n\`\`\`\nhelm repo add ${chart.repoName} ${chart.repoUrl}\nhelm install my-release ${chart.repoName}/${chart.name} --namespace ${chart.name}\n\`\`\`\n`,
    valuesYaml: `# Default values for ${chart.name}\nreplicaCount: 1\nimage:\n  repository: ${chart.name}\n  tag: ${chart.appVersion || 'latest'}\n  pullPolicy: IfNotPresent\nresources: {}\n`,
    versions: [{ version: chart.version, appVersion: chart.appVersion }],
    installCommand: installCommand(chart.repoName, chart.name)
  }
}

function demoRel(
  name: string,
  namespace: string,
  chartName: string,
  chartVersion: string,
  appVersion: string,
  revision: number
): HelmRelease {
  return {
    id: `${namespace}/${name}`,
    name,
    namespace,
    revision,
    status: 'deployed',
    chartName,
    chartVersion,
    appVersion,
    updated: new Date().toISOString()
  }
}

export function demoHelmReleases(): HelmRelease[] {
  return [
    demoRel('argo-cd', 'argocd', 'argo-cd', '7.8.2', 'v2.14.5', 25),
    demoRel('redis', 'data', 'redis', '20.6.1', '7.4.2', 8),
    demoRel('rabbitmq', 'data', 'rabbitmq', '15.4.1', '3.13.2', 3),
    demoRel('prometheus-stack', 'monitoring', 'kube-prometheus-stack', '69.7.1', 'v0.80.0', 12),
    demoRel('goldilocks', 'goldilocks', 'goldilocks', '10.5.0', 'v4.14.1', 2),
    demoRel('loki', 'logging', 'loki', '6.27.0', '3.4.2', 4),
    demoRel('ingress-nginx', 'ingress-nginx', 'ingress-nginx', '4.12.1', '1.12.1', 9),
    demoRel('cert-manager', 'cert-manager', 'cert-manager', '1.16.2', 'v1.16.2', 6)
  ]
}

export function demoHelmReleaseDetail(namespace: string, name: string): HelmReleaseDetail {
  const release = demoHelmReleases().find((r) => r.namespace === namespace && r.name === name) ?? demoHelmReleases()[0]
  const ns = release.namespace
  return {
    revision: release.revision,
    status: release.status,
    chartName: release.chartName,
    chartVersion: release.chartVersion,
    appVersion: release.appVersion,
    updated: release.updated,
    valuesYaml: `${release.chartName}:\n  replicaCount: 1\n  fullnameOverride: ${release.name}\n`,
    notes: `## ${release.name}\n\nInstalled in **${ns}** from chart \`${release.chartName}-${release.chartVersion}\`.\n`,
    resources: [
      { id: `deploy/${ns}/${release.name}`, kind: 'Deployment', apiVersion: 'apps/v1', name: release.name, namespace: ns, resourceKind: 'Deployments' },
      { id: `svc/${ns}/${release.name}`, kind: 'Service', apiVersion: 'v1', name: release.name, namespace: ns, resourceKind: 'Services' },
      { id: `cm/${ns}/${release.name}`, kind: 'ConfigMap', apiVersion: 'v1', name: `${release.name}-cm`, namespace: ns, resourceKind: 'ConfigMaps' }
    ]
  }
}

export function demoHelmHistory(namespace: string, name: string): HelmReleaseHistoryEntry[] {
  const release = demoHelmReleases().find((r) => r.namespace === namespace && r.name === name) ?? demoHelmReleases()[0]
  return [
    {
      id: `${release.id}-r${release.revision}`,
      revision: release.revision,
      status: 'deployed',
      chartName: release.chartName,
      chartVersion: release.chartVersion,
      appVersion: release.appVersion,
      updated: release.updated,
      description: 'Upgrade complete'
    },
    {
      id: `${release.id}-r${Math.max(1, release.revision - 1)}`,
      revision: Math.max(1, release.revision - 1),
      status: 'superseded',
      chartName: release.chartName,
      chartVersion: release.chartVersion,
      appVersion: release.appVersion,
      updated: release.updated,
      description: 'Install complete'
    }
  ]
}

export async function resolveChartRepo(chartName: string): Promise<{ repoName: string; repoUrl: string } | null> {
  const demo = BUILTIN_HELM_CHARTS.find((c) => c.name === chartName)
  if (demo) return { repoName: demo.repoName, repoUrl: demo.repoUrl }
  try {
    const charts = await searchHelmCatalog(chartName)
    const match = charts.find((c) => c.name === chartName) ?? charts[0]
    return match ? { repoName: match.repoName, repoUrl: match.repoUrl } : null
  } catch {
    return null
  }
}
