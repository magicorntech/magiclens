import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ResourceFocus } from '@shared/types/navigation'
import { demoHelmCatalog } from '@shared/helmBuiltinCatalog'
import { useHelmCatalog, useHelmReleases } from '../../queries/useHelm'
import { HelmLogo } from '../../icons/HelmLogo'
import { HelmChartBrowser } from './HelmChartBrowser'
import { HelmReleaseBrowser } from './HelmReleaseBrowser'
import './helm-editor.css'

interface HelmPackageEditorProps {
  clusterId: string
  initialTab?: 'charts' | 'releases'
  onNavigateToResource: (focus: ResourceFocus) => void
  initialRelease?: { namespace: string; name: string } | null
  onReleaseFocusConsumed?: () => void
}

export function HelmPackageEditor({
  clusterId,
  initialTab = 'charts',
  onNavigateToResource,
  initialRelease,
  onReleaseFocusConsumed
}: HelmPackageEditorProps): React.JSX.Element {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'charts' | 'releases'>(initialTab)
  const catalog = useHelmCatalog(clusterId, '')
  const releases = useHelmReleases(clusterId)
  const remoteCount = catalog.data && 'charts' in catalog.data ? catalog.data.charts.length : 0
  const chartCount = remoteCount > 0 ? remoteCount : catalog.isPending ? 0 : demoHelmCatalog('').length
  const releaseCount = releases.data && 'releases' in releases.data ? releases.data.releases.length : 0

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (initialRelease) setTab('releases')
  }, [initialRelease])

  return (
    <div className="ml-helm-editor">
      <header className="ml-helm-editor__header">
        <div className="ml-helm-editor__brand">
          <HelmLogo size={18} />
          <span>
            Helm <span>/</span> {t('helmEditor.packageEditor')}
          </span>
        </div>
        <div className="ml-helm-editor__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'charts'}
            className={tab === 'charts' ? 'is-active' : undefined}
            onClick={() => setTab('charts')}
          >
            {t('helmEditor.charts')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'releases'}
            className={tab === 'releases' ? 'is-active' : undefined}
            onClick={() => setTab('releases')}
          >
            {t('helmEditor.releases')}
          </button>
        </div>
        <span className="ml-helm-editor__header-count">
          {tab === 'charts'
            ? t('helmEditor.chartCount', { count: chartCount })
            : t('helmEditor.releaseCount', { count: releaseCount })}
        </span>
      </header>
      <div className="ml-helm-editor__body">
        {tab === 'charts' ? (
          <HelmChartBrowser clusterId={clusterId} />
        ) : (
          <HelmReleaseBrowser
            clusterId={clusterId}
            onNavigateToResource={onNavigateToResource}
            initialRelease={initialRelease}
            onReleaseFocusConsumed={onReleaseFocusConsumed}
          />
        )}
      </div>
    </div>
  )
}
