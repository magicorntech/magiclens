import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Empty, Input, Select, Spin, message, type InputRef } from 'antd'
import Editor from '@monaco-editor/react'
import { marked } from 'marked'
import { Copy, Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { HelmCatalogChart } from '@shared/types/helm'
import { demoHelmCatalog } from '@shared/helmBuiltinCatalog'
import { useHelmCatalog, useHelmInstall, useHelmPackage } from '../../queries/useHelm'
import { useNamespaces } from '../../queries/useNamespaces'
import { useClusterStore } from '../../stores/clusterStore'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { setupMonaco } from '../Editor/setupMonaco'
import { Icon } from '../ui/Icon'
import { HelmLogo } from '../../icons/HelmLogo'
import { HelmEditorPanes } from './HelmEditorPanes'

setupMonaco()

interface HelmChartBrowserProps {
  clusterId: string
}

function helmReleaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 53) || 'release'
}

function githubRawBase(sourceUrl: string | null | undefined): string | null {
  if (!sourceUrl) return null
  const match = sourceUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i)
  if (!match) return null
  return `https://raw.githubusercontent.com/${match[1]}/${match[2].replace(/\.git$/, '')}/HEAD/`
}

function rewriteReadme(markdown: string, sourceUrl: string | null | undefined): string {
  const base = githubRawBase(sourceUrl)
  if (!base) return markdown
  return markdown
    .replace(/<img([^>]*?)\ssrc="(?!https?:|data:|\/\/)([^"]+)"/gi, (_all, attrs: string, src: string) => {
      return `<img${attrs} src="${base}${src.replace(/^\.\//, '')}"`
    })
    .replace(/!\[([^\]]*)\]\((?!https?:|data:|\/\/)([^)]+)\)/g, (_all, alt: string, src: string) => {
      return `![${alt}](${base}${src.replace(/^\.\//, '')})`
    })
}

function decodeHtml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function readmeHtml(markdown: string, sourceUrl: string | null | undefined): string {
  const raw = marked.parse(rewriteReadme(markdown || '', sourceUrl), { async: false, gfm: true }) as string
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<a /g, '<a target="_blank" rel="noreferrer noopener" ')
    .replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (_all, attrs: string, body: string) => {
      const text = encodeURIComponent(decodeHtml(body.replace(/<[^>]+>/g, '')))
      return `<div class="ml-helm-md-pre"><button type="button" class="ml-helm-md-copy" data-copy="${text}">Copy</button><pre><code${attrs}>${body}</code></pre></div>`
    })
}

export function HelmChartBrowser({ clusterId }: HelmChartBrowserProps): React.JSX.Element {
  const { t } = useTranslation()
  const isDark = useResolvedDarkMode()
  const searchRef = useRef<InputRef>(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [releaseName, setReleaseName] = useState('')
  const [namespace, setNamespace] = useState('default')
  const [valuesYaml, setValuesYaml] = useState('')
  const selectedNamespace = useClusterStore(
    (s) => s.clusters.find((c) => c.id === clusterId)?.selectedNamespace ?? 'ALL'
  )
  const nsQuery = useNamespaces(clusterId)
  const install = useHelmInstall(clusterId)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 320)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (selectedNamespace && selectedNamespace !== 'ALL' && !selectedNamespace.includes(',')) {
      setNamespace(selectedNamespace)
    }
  }, [selectedNamespace])

  const catalogQuery = useHelmCatalog(clusterId, debounced)
  const remoteCharts = catalogQuery.data && 'charts' in catalogQuery.data ? catalogQuery.data.charts : []
  const charts = remoteCharts.length > 0 ? remoteCharts : catalogQuery.isPending ? [] : demoHelmCatalog(debounced)
  const catalogError =
    remoteCharts.length > 0 || charts.length > 0
      ? null
      : catalogQuery.data && 'error' in catalogQuery.data
        ? catalogQuery.data.error
        : null

  const selected = charts.find((c) => c.id === selectedId) ?? null

  useEffect(() => {
    if (charts.length === 0) return
    if (selectedId && charts.some((c) => c.id === selectedId)) return
    const first = charts[0]
    setSelectedId(first.id)
    setVersion(first.version)
    setReleaseName(helmReleaseName(first.name))
  }, [charts, selectedId])

  const pkgQuery = useHelmPackage(
    clusterId,
    selected?.repoName ?? null,
    selected?.name ?? null,
    version,
    selected?.repoUrl ?? null,
    selected?.packageId ?? null
  )
  const pkg = pkgQuery.data && 'pkg' in pkgQuery.data ? pkgQuery.data.pkg : null
  const pkgError = pkgQuery.data && 'error' in pkgQuery.data ? pkgQuery.data.error : null

  useEffect(() => {
    if (pkg?.valuesYaml != null) setValuesYaml(pkg.valuesYaml)
  }, [pkg?.id, pkg?.valuesYaml])

  const namespaces = nsQuery.data && 'namespaces' in nsQuery.data ? nsQuery.data.namespaces : ['default']
  const html = useMemo(
    () => readmeHtml(pkg?.readme || selected?.description || '', pkg?.sourceUrl || pkg?.homeUrl),
    [pkg?.readme, pkg?.sourceUrl, pkg?.homeUrl, selected?.description]
  )
  const installCmd = pkg?.installCommand ?? (selected ? `helm install my-release ${selected.repoName}/${selected.name}` : '')
  const chartRef = selected ? `${selected.repoName}/${selected.name}` : ''
  const versionOptions = (pkg?.versions.length
    ? pkg.versions
    : selected
      ? [{ version: selected.version, appVersion: selected.appVersion }]
      : []
  ).map((v) => ({ value: v.version, label: `v${v.version}` }))

  async function copy(text: string): Promise<void> {
    await navigator.clipboard.writeText(text)
    message.success(t('helmEditor.copied'))
  }

  async function deploy(): Promise<void> {
    if (!selected || !pkg) return
    const res = await install.mutateAsync({
      repoName: pkg.repoName,
      repoUrl: pkg.repoUrl,
      chartName: pkg.name,
      version: pkg.version,
      releaseName: helmReleaseName(releaseName),
      namespace,
      valuesYaml
    })
    if ('error' in res) {
      message.error(res.error)
      return
    }
    message.success(t('helmEditor.deployed'))
  }

  return (
    <HelmEditorPanes
      left={
        <>
        <div className="ml-helm-editor__search">
          <Input
            ref={searchRef}
            allowClear
            prefix={<Icon icon={Search} variant="micro" />}
            placeholder={t('helmEditor.searchCharts')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            type="primary"
            className="ml-helm-editor__add"
            aria-label={t('helmEditor.addRepo')}
            icon={<Icon icon={Plus} variant="detail" />}
            onClick={() => searchRef.current?.focus()}
          />
        </div>
        <div className="ml-helm-editor__count">
          <span>{t('helmEditor.chartCount', { count: charts.length })}</span>
          <span>{t('helmEditor.nameHeader')}</span>
        </div>
        <div className="ml-helm-editor__cards">
          {catalogQuery.isLoading && charts.length === 0 ? (
            <div className="ml-helm-editor__center">
              <Spin />
            </div>
          ) : catalogError ? (
            <Empty description={catalogError} />
          ) : charts.length === 0 ? (
            <Empty description={t('helmEditor.noCharts')} />
          ) : (
            charts.map((chart) => (
              <ChartCard
                key={chart.id}
                chart={chart}
                active={selected?.id === chart.id}
                onSelect={() => {
                  setSelectedId(chart.id)
                  setVersion(chart.version)
                  setReleaseName(helmReleaseName(chart.name))
                }}
              />
            ))
          )}
        </div>
        </>
      }
      center={
      <div className="ml-helm-editor__readme">
        {!selected ? (
          <Empty description={t('helmEditor.pickChart')} />
        ) : (
          <>
            <div className="ml-helm-editor__readme-head">
              <span className="ml-helm-editor__badge">
                {selected.repoName} <span>·</span> {t('helmEditor.applicationChart')}
              </span>
              <div className="ml-helm-editor__title-row">
                <h2>{pkg?.displayName || selected.displayName}</h2>
              </div>
              <div className="ml-helm-editor__desc-row">
                <p>{pkg?.description || selected.description}</p>
                <label className="ml-helm-editor__version-field">
                  {t('helmEditor.versionLabel')}
                  <Select
                    size="small"
                    value={version ?? selected.version}
                    onChange={setVersion}
                    options={versionOptions}
                    popupMatchSelectWidth={false}
                    style={{ minWidth: 118 }}
                  />
                </label>
              </div>
              <div className="ml-helm-editor__cmd">
                <code>
                  <span>$</span> {installCmd}
                </code>
                <em>v{pkg?.version || selected.version}</em>
                <button type="button" onClick={() => void copy(installCmd)} aria-label={t('helmEditor.copy')}>
                  <Icon icon={Copy} variant="micro" />
                  {t('helmEditor.copy')}
                </button>
              </div>
            </div>
            {pkgQuery.isFetching && !html.trim() ? (
              <div className="ml-helm-editor__center">
                <Spin />
              </div>
            ) : pkgError && !html.trim() ? (
              <Empty description={pkgError} />
            ) : (
              <div
                className="ml-helm-editor__markdown"
                dangerouslySetInnerHTML={{ __html: html }}
                onClick={(event) => {
                  const btn = (event.target as HTMLElement).closest<HTMLElement>('[data-copy]')
                  if (!btn?.dataset.copy) return
                  void copy(decodeURIComponent(btn.dataset.copy))
                }}
              />
            )}
          </>
        )}
      </div>
      }
      right={
        <>
        <div className="ml-helm-editor__install-bar">
          <div>
            <strong>{t('helmEditor.install')}</strong>
            {chartRef ? <div className="ml-helm-editor__install-chart">{chartRef}</div> : null}
          </div>
          <Button
            type="primary"
            className="ml-helm-editor__deploy"
            loading={install.isPending}
            disabled={!pkg}
            onClick={() => void deploy()}
          >
            {t('helmEditor.deploy')}
          </Button>
        </div>
        <label>
          {t('helmEditor.releaseName')}
          <Input value={releaseName} onChange={(e) => setReleaseName(e.target.value)} />
        </label>
        <div className="ml-helm-editor__install-row">
          <label>
            {t('helmEditor.namespace')}
            <Select
              showSearch
              value={namespace}
              onChange={setNamespace}
              options={namespaces.map((ns) => ({ value: ns, label: ns }))}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            {t('helmEditor.version')}
            <Select
              value={version ?? selected?.version}
              onChange={setVersion}
              options={versionOptions}
              style={{ width: '100%' }}
            />
          </label>
        </div>
        <div className="ml-helm-editor__values-label">
          <span>values.yaml</span>
          <em>{t('helmEditor.yaml')}</em>
        </div>
        <div className="ml-helm-editor__values">
          <Editor
            language="yaml"
            theme={isDark ? 'vs-dark' : 'vs'}
            value={valuesYaml}
            onChange={(v) => setValuesYaml(v ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: 'var(--ml-font-mono)',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 8, bottom: 8 }
            }}
          />
        </div>
        </>
      }
    />
  )
}

function ChartCard({
  chart,
  active,
  onSelect
}: {
  chart: HelmCatalogChart
  active: boolean
  onSelect: () => void
}): React.JSX.Element {
  const [broken, setBroken] = useState(false)
  return (
    <button type="button" className={`ml-helm-card${active ? ' is-active' : ''}`} onClick={onSelect}>
      <span className="ml-helm-card__icon">
        {chart.logoUrl && !broken ? (
          <img src={chart.logoUrl} alt="" onError={() => setBroken(true)} />
        ) : (
          <HelmLogo size={22} />
        )}
      </span>
      <span className="ml-helm-card__body">
        <span className="ml-helm-card__top">
          <strong>{chart.displayName}</strong>
          <em>v{chart.version}</em>
        </span>
        <span className="ml-helm-card__desc">{chart.description || '—'}</span>
        <span className="ml-helm-card__meta-row">
          <span className="ml-helm-card__repo">{chart.repoName}</span>
          {chart.appVersion ? <span className="ml-helm-card__app">app {chart.appVersion}</span> : null}
        </span>
      </span>
    </button>
  )
}
