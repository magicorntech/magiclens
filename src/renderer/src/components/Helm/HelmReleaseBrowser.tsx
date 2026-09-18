import { useEffect, useMemo, useState } from 'react'
import { Button, Empty, Input, Modal, Spin, message } from 'antd'
import Editor from '@monaco-editor/react'
import { marked } from 'marked'
import { RotateCcw, Search, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import type { HelmManifestResource, HelmRelease } from '@shared/types/helm'
import type { ResourceFocus } from '@shared/types/navigation'
import { useHelmHistory, useHelmInstall, useHelmReleaseDetail, useHelmReleases, useHelmUninstallRelease } from '../../queries/useHelm'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { setupMonaco } from '../Editor/setupMonaco'
import { ResizableTable } from '../../utils/ResizableTable'
import { Icon } from '../ui/Icon'
import { HelmLogo } from '../../icons/HelmLogo'
import { HelmReleaseHistoryTab } from './HelmReleaseHistoryTab'
import { HelmEditorPanes } from './HelmEditorPanes'

setupMonaco()

type ReleaseTab = 'notes' | 'resources' | 'history'

interface HelmReleaseBrowserProps {
  clusterId: string
  onNavigateToResource: (focus: ResourceFocus) => void
  initialRelease?: { namespace: string; name: string } | null
  onReleaseFocusConsumed?: () => void
}

function readmeHtml(markdown: string): string {
  const raw = marked.parse(markdown || '', { async: false }) as string
  return raw.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
}

export function HelmReleaseBrowser({
  clusterId,
  onNavigateToResource,
  initialRelease,
  onReleaseFocusConsumed
}: HelmReleaseBrowserProps): React.JSX.Element {
  const { t } = useTranslation()
  const isDark = useResolvedDarkMode()
  const queryClient = useQueryClient()
  const { data, isLoading } = useHelmReleases(clusterId)
  const uninstall = useHelmUninstallRelease(clusterId)
  const upgrade = useHelmInstall(clusterId)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<ReleaseTab>('resources')
  const [valuesYaml, setValuesYaml] = useState('')

  const releases = data && 'releases' in data ? data.releases : []
  const error = data && 'error' in data ? data.error : null
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return releases
    return releases.filter((r) =>
      [r.name, r.namespace, r.chartName, r.chartVersion, r.appVersion, r.status].join(' ').toLowerCase().includes(q)
    )
  }, [releases, search])

  const selected = filtered.find((r) => r.id === selectedId) ?? null

  useEffect(() => {
    if (filtered.length === 0) return
    if (selectedId && filtered.some((r) => r.id === selectedId)) return
    setSelectedId(filtered[0].id)
  }, [filtered, selectedId])

  useEffect(() => {
    if (!initialRelease || releases.length === 0) return
    const match = releases.find((r) => r.namespace === initialRelease.namespace && r.name === initialRelease.name)
    if (match) setSelectedId(match.id)
    onReleaseFocusConsumed?.()
  }, [initialRelease, releases, onReleaseFocusConsumed])

  const detailQuery = useHelmReleaseDetail(clusterId, selected?.namespace ?? null, selected?.name ?? null, !!selected)
  const detail = detailQuery.data && 'detail' in detailQuery.data ? detailQuery.data.detail : null
  const detailError = detailQuery.data && 'error' in detailQuery.data ? detailQuery.data.error : null
  const historyQuery = useHelmHistory(tab === 'history' || !!selected ? clusterId : null, selected?.namespace ?? null, selected?.name ?? null)

  useEffect(() => {
    if (detail?.valuesYaml != null) setValuesYaml(detail.valuesYaml)
  }, [detail?.revision, selected?.id])

  function confirmDelete(release: HelmRelease): void {
    Modal.confirm({
      title: t('helmEditor.deleteReleaseTitle', { name: release.name }),
      content: t('helmEditor.deleteReleaseBody', { namespace: release.namespace }),
      okText: t('helmEditor.delete'),
      okType: 'danger',
      onOk: async () => {
        const res = await uninstall.mutateAsync({ namespace: release.namespace, name: release.name })
        if ('error' in res) {
          message.error(res.error)
          throw new Error(res.error)
        }
        message.success(t('helmEditor.deleted'))
        if (selectedId === release.id) setSelectedId(null)
      }
    })
  }

  async function rollback(release: HelmRelease): Promise<void> {
    const history = historyQuery.data && 'history' in historyQuery.data ? historyQuery.data.history : []
    const previous = history.find((h) => h.status !== 'deployed') ?? history[1]
    if (!previous) {
      message.warning(t('helmEditor.noRollback'))
      return
    }
    const res = await window.api.helm.rollback({
      clusterId,
      namespace: release.namespace,
      name: release.name,
      targetRevision: previous.revision
    })
    if ('error' in res) {
      message.error(res.error)
      return
    }
    message.success(t('helmEditor.rolledBack', { revision: previous.revision }))
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['helm-releases', clusterId] }),
      queryClient.invalidateQueries({ queryKey: ['helm-release-detail', clusterId, release.namespace, release.name] }),
      queryClient.invalidateQueries({ queryKey: ['helm-history', clusterId, release.namespace, release.name] })
    ])
  }

  async function updateRelease(release: HelmRelease): Promise<void> {
    const res = await upgrade.mutateAsync({
      repoName: release.chartName,
      repoUrl: '',
      chartName: release.chartName,
      version: release.chartVersion,
      releaseName: release.name,
      namespace: release.namespace,
      valuesYaml
    })
    if ('error' in res) {
      message.error(res.error)
      return
    }
    message.success(t('helmEditor.updated'))
  }

  const resourceColumns: ColumnsType<HelmManifestResource> = [
    { title: t('helmEditor.colName'), dataIndex: 'name', key: 'name', ellipsis: true },
    { title: t('helmEditor.colNamespace'), dataIndex: 'namespace', key: 'namespace', width: 140, ellipsis: true },
    { title: t('helmEditor.colKind'), dataIndex: 'kind', key: 'kind', width: 180, ellipsis: true }
  ]

  return (
    <HelmEditorPanes
      left={
        <>
          <div className="ml-helm-editor__search">
            <Input
              allowClear
              prefix={<Icon icon={Search} variant="micro" />}
              placeholder={t('helmEditor.searchReleases')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="ml-helm-editor__count">
            <span>{t('helmEditor.releaseCount', { count: filtered.length })}</span>
            <span>{t('helmEditor.nameHeader')}</span>
          </div>
          <div className="ml-helm-editor__cards">
            {isLoading ? (
              <div className="ml-helm-editor__center">
                <Spin />
              </div>
            ) : error ? (
              <Empty description={error} />
            ) : filtered.length === 0 ? (
              <Empty description={t('helmEditor.noReleases')} />
            ) : (
              filtered.map((release) => (
                <button
                  key={release.id}
                  type="button"
                  className={`ml-helm-card${selected?.id === release.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedId(release.id)}
                >
                  <span className="ml-helm-card__icon">
                    <HelmLogo size={22} />
                  </span>
                  <span className="ml-helm-card__body">
                    <span className="ml-helm-card__top">
                      <strong>{release.name}</strong>
                      <span className={`ml-helm-status is-${release.status}`}>{release.status}</span>
                    </span>
                    <span className="ml-helm-card__desc">
                      {release.chartName} {release.chartVersion}
                    </span>
                    <span className="ml-helm-card__meta">
                      {t('helmEditor.revision', { n: release.revision })}
                      {release.appVersion ? ` · app ${release.appVersion}` : ''}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      }
      center={
      <div className="ml-helm-release-main">
          {!selected ? (
            <Empty description={t('helmEditor.pickRelease')} />
          ) : (
            <>
              <div className="ml-helm-release-head">
                <div className="ml-helm-release-kicker">
                  <span className={`ml-helm-status is-${selected.status}`}>{selected.status}</span>
                  <em>
                    {selected.chartName} · {selected.namespace}
                  </em>
                </div>
                <div className="ml-helm-editor__title-row">
                  <h2>{selected.name}</h2>
                  <div className="ml-helm-release-actions">
                    <Button danger icon={<Icon icon={Trash2} variant="detail" />} onClick={() => confirmDelete(selected)}>
                      {t('helmEditor.delete')}
                    </Button>
                    <Button icon={<Icon icon={RotateCcw} variant="detail" />} onClick={() => void rollback(selected)}>
                      {t('helmEditor.rollback')}
                    </Button>
                  </div>
                </div>
                <p>
                  {selected.chartName}-{selected.chartVersion} · {t('helmEditor.revision', { n: selected.revision })}
                </p>
              </div>
              <div className="ml-helm-release-tabs" role="tablist">
                {(['notes', 'resources', 'history'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    className={tab === key ? 'is-active' : undefined}
                    onClick={() => setTab(key)}
                  >
                    {t(`helmEditor.tab.${key}`)}
                  </button>
                ))}
              </div>
              <div className="ml-helm-release-tabbody">
                {detailQuery.isFetching && !detail ? (
                  <div className="ml-helm-editor__center">
                    <Spin />
                  </div>
                ) : detailError ? (
                  <Empty description={detailError} />
                ) : tab === 'notes' ? (
                  detail?.notes ? (
                    <div className="ml-helm-editor__markdown" dangerouslySetInnerHTML={{ __html: readmeHtml(detail.notes) }} />
                  ) : (
                    <Empty description={t('helmEditor.noNotes')} />
                  )
                ) : tab === 'history' ? (
                  <HelmReleaseHistoryTab
                    clusterId={clusterId}
                    namespace={selected.namespace}
                    name={selected.name}
                    active
                  />
                ) : (
                  <ResizableTable
                    tableKey="helm-release-resources"
                    rowKey="id"
                    size="small"
                    columns={resourceColumns}
                    dataSource={detail?.resources ?? []}
                    pagination={false}
                    onRow={(resource) => ({
                      style: { cursor: resource.resourceKind ? 'pointer' : 'default' },
                      onClick: () => {
                        if (!resource.resourceKind) return
                        onNavigateToResource({
                          kind: resource.resourceKind,
                          namespace: resource.namespace,
                          name: resource.name
                        })
                      }
                    })}
                  />
                )}
              </div>
            </>
          )}
      </div>
      }
      right={
        <>
          <div className="ml-helm-editor__install-bar">
            <div>
              <strong>{t('helmEditor.upgrade')}</strong>
              {selected ? <div className="ml-helm-editor__install-chart">{selected.chartName}</div> : null}
            </div>
            <Button
              type="primary"
              className="ml-helm-editor__deploy"
              loading={upgrade.isPending}
              disabled={!selected}
              onClick={() => selected && void updateRelease(selected)}
            >
              {t('helmEditor.update')}
            </Button>
          </div>
          <label>
            {t('helmEditor.releaseName')}
            <Input value={selected?.name ?? ''} disabled />
          </label>
          <label>
            {t('helmEditor.namespace')}
            <Input value={selected?.namespace ?? ''} disabled />
          </label>
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
                padding: { top: 8, bottom: 8 },
                readOnly: !selected
              }}
            />
          </div>
        </>
      }
    />
  )
}
