import { Button, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { GLOBAL_SEARCH_TYPES, type GlobalSearchType } from '@shared/types/search'
import { useSearchSettingsStore, type SearchResultLimit } from '../../stores/searchSettingsStore'
import { SettingsPaneTabs, SettingsRow, SettingsSection, SettingsToggleRow } from './SettingsPrimitives'
import './searchSettings.css'

const TYPE_LABEL_KEY: Record<GlobalSearchType, string> = {
  clusters: 'settings.search.types.clusters',
  sparks: 'settings.search.types.sparks',
  security: 'settings.search.types.security',
  namespaces: 'settings.search.types.namespaces',
  pods: 'settings.search.types.pods',
  deployments: 'settings.search.types.deployments',
  statefulsets: 'settings.search.types.statefulsets',
  daemonsets: 'settings.search.types.daemonsets',
  replicasets: 'settings.search.types.replicasets',
  services: 'settings.search.types.services',
  ingresses: 'settings.search.types.ingresses',
  configmaps: 'settings.search.types.configmaps',
  secrets: 'settings.search.types.secrets',
  pvc: 'settings.search.types.pvc',
  pv: 'settings.search.types.pv',
  nodes: 'settings.search.types.nodes',
  events: 'settings.search.types.events',
  'helm-releases': 'settings.search.types.helmReleases',
  crds: 'settings.search.types.crds',
  'custom-resources': 'settings.search.types.customResources'
}

export function SearchSettings({
  pane,
  onPaneChange
}: {
  pane: string
  onPaneChange: (pane: string) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const enabledTypes = useSearchSettingsStore((s) => s.enabledTypes)
  const limitPerType = useSearchSettingsStore((s) => s.limitPerType)
  const searchAllConnected = useSearchSettingsStore((s) => s.searchAllConnected)
  const rememberRecent = useSearchSettingsStore((s) => s.rememberRecent)
  const recent = useSearchSettingsStore((s) => s.recent)
  const toggleType = useSearchSettingsStore((s) => s.toggleType)
  const setAllTypes = useSearchSettingsStore((s) => s.setAllTypes)
  const setLimit = useSearchSettingsStore((s) => s.setLimit)
  const setSearchAllConnected = useSearchSettingsStore((s) => s.setSearchAllConnected)
  const setRememberRecent = useSearchSettingsStore((s) => s.setRememberRecent)
  const clearRecent = useSearchSettingsStore((s) => s.clearRecent)
  const enabled = new Set(enabledTypes)

  return (
    <>
      <SettingsPaneTabs
        value={pane}
        onChange={onPaneChange}
        options={[
          { value: 'behavior', label: t('settings.panes.behavior') },
          { value: 'sources', label: t('settings.panes.sources') }
        ]}
      />
      {pane === 'sources' ? (
        <SettingsSection
          title={t('settings.search.typesTitle')}
          description={t('settings.search.typesHint')}
          actions={
            <Button size="small" onClick={() => setAllTypes(enabledTypes.length !== GLOBAL_SEARCH_TYPES.length)}>
              {enabledTypes.length === GLOBAL_SEARCH_TYPES.length
                ? t('settings.search.disableAll')
                : t('settings.search.enableAll')}
            </Button>
          }
        >
          <div className="ml-search-types">
            {GLOBAL_SEARCH_TYPES.map((type) => {
              const on = enabled.has(type)
              return (
                <button
                  key={type}
                  type="button"
                  className={`ml-search-types__chip${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggleType(type)}
                >
                  {t(TYPE_LABEL_KEY[type])}
                </button>
              )
            })}
          </div>
        </SettingsSection>
      ) : (
        <SettingsSection title={t('settings.search.behaviorTitle')} description={t('settings.search.behaviorHint')}>
          <SettingsRow
            title={t('settings.search.limitTitle')}
            description={t('settings.search.limitHint')}
            control={
              <Select
                value={limitPerType}
                style={{ width: 120 }}
                options={[8, 15, 30].map((value) => ({ value, label: String(value) }))}
                onChange={(value: SearchResultLimit) => setLimit(value)}
              />
            }
          />
          <SettingsToggleRow
            title={t('settings.search.allClusters')}
            description={t('settings.search.allClustersHint')}
            checked={searchAllConnected}
            onChange={setSearchAllConnected}
          />
          <SettingsToggleRow
            title={t('settings.search.recentTitle')}
            description={t('settings.search.recentHint')}
            checked={rememberRecent}
            onChange={setRememberRecent}
          />
          {recent.length > 0 ? (
            <div className="ml-search-recent">
              <div className="ml-search-recent__list">
                {recent.map((item) => (
                  <span key={item} className="ml-search-recent__item">
                    {item}
                  </span>
                ))}
              </div>
              <Button size="small" onClick={clearRecent}>
                {t('settings.search.clearRecent')}
              </Button>
            </div>
          ) : null}
        </SettingsSection>
      )}
    </>
  )
}
