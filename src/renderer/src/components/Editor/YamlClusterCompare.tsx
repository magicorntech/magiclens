import { useMemo, useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { Select } from 'antd'
import { GitCompare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ResourceKind } from '@shared/resourceKinds'
import type { ResourceMutationTarget } from '@shared/types/resourceMutation'
import { useClusterStore } from '../../stores/clusterStore'
import { useResolvedDarkMode } from '../../stores/useResolvedDarkMode'
import { Icon } from '../ui/Icon'

interface YamlClusterCompareProps {
  clusterId: string
  kind: ResourceKind
  namespace: string
  name: string
  localYaml: string
  target?: ResourceMutationTarget
  yamlClassName?: string
}

export function YamlClusterCompare({
  clusterId,
  kind,
  namespace,
  name,
  localYaml,
  target,
  yamlClassName = 'ml-detail-yaml'
}: YamlClusterCompareProps): React.JSX.Element {
  const { t } = useTranslation()
  const isDark = useResolvedDarkMode()
  const clusters = useClusterStore((s) => s.clusters)
  const others = useMemo(
    () => clusters.filter((c) => c.id !== clusterId && c.status === 'connected'),
    [clusters, clusterId]
  )
  const [otherId, setOtherId] = useState<string | null>(null)
  const [otherYaml, setOtherYaml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const other = clusters.find((c) => c.id === otherId)

  async function loadOther(id: string): Promise<void> {
    setOtherId(id)
    setLoading(true)
    setError(null)
    setOtherYaml(null)
    try {
      const res = await window.api.resource.getManifest({
        clusterId: id,
        namespace,
        name,
        target: target ?? { type: 'builtin', kind }
      })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setOtherYaml(res.yaml ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const comparing = otherYaml != null && other != null

  return (
    <div className="ml-yaml-compare">
      {others.length > 0 ? (
        <div className="ml-yaml-compare__bar">
          <Icon icon={GitCompare} variant="detail" />
          <span>{t('yamlCompare.label')}</span>
          <Select
            size="small"
            allowClear
            placeholder={t('yamlCompare.pickCluster')}
            style={{ minWidth: 180 }}
            value={otherId}
            options={others.map((c) => ({ value: c.id, label: c.customName }))}
            onChange={(id) => {
              if (!id) {
                setOtherId(null)
                setOtherYaml(null)
                setError(null)
                return
              }
              void loadOther(id)
            }}
          />
        </div>
      ) : null}
      {loading ? <div className="ml-yaml-compare__status">{t('common.loading')}</div> : null}
      {error ? <div className="ml-yaml-compare__status is-bad">{error}</div> : null}
      {comparing ? (
        <div className="ml-yaml-compare__diff">
          <div className="ml-yaml-compare__heads">
            <span>{other.customName}</span>
            <span>{t('yamlCompare.thisCluster')}</span>
          </div>
          <DiffEditor
            language="yaml"
            theme={isDark ? 'vs-dark' : 'vs'}
            original={otherYaml}
            modified={localYaml}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              renderSideBySide: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              padding: { top: 8, bottom: 8 }
            }}
          />
        </div>
      ) : (
        <pre className={yamlClassName}>{localYaml}</pre>
      )}
    </div>
  )
}
