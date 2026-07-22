import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { TopologyPage } from './TopologyPage'

interface TopologyPopoutAppProps {
  clusterId: string
  namespace: string
}

export function TopologyPopoutApp({
  clusterId,
  namespace
}: TopologyPopoutAppProps): React.JSX.Element {
  const { t } = useTranslation()
  const hydrateDisplaySettings = useDisplaySettingsStore((s) => s.hydrate)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void hydrateDisplaySettings().finally(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [hydrateDisplaySettings])

  if (!ready) {
    return (
      <div className="ml-topo-popout ml-topo-popout--loading">
        <Spin tip={t('topology.loading')} />
      </div>
    )
  }

  return (
    <div className="ml-topo-popout">
      <TopologyPage clusterId={clusterId} namespace={namespace} popout />
    </div>
  )
}

export function parseTopologyPopoutRoute(): { clusterId: string; namespace: string } | null {
  const fromSearch = new URLSearchParams(window.location.search)
  if (fromSearch.get('mlTopology') === '1') {
    const clusterId = fromSearch.get('clusterId')?.trim()
    if (clusterId) {
      return {
        clusterId,
        namespace: fromSearch.get('namespace')?.trim() || 'default'
      }
    }
  }

  const hash = window.location.hash || ''
  if (!hash.includes('topology-popout')) return null
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  const params = new URLSearchParams(query)
  const clusterId = params.get('clusterId')?.trim()
  if (!clusterId) return null
  return {
    clusterId,
    namespace: params.get('namespace')?.trim() || 'default'
  }
}
