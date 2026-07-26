import { Select } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  ALL_NAMESPACES,
  normalizeNamespaceSelect,
  parseNamespaceSelection,
  serializeNamespaceSelection
} from '@shared/namespaceSelection'
import { useNamespaces } from '../../queries/useNamespaces'

interface NamespaceSelectorProps {
  clusterId: string
  value: string
  onChange: (namespace: string) => void
}

export function NamespaceSelector({
  clusterId,
  value,
  onChange
}: NamespaceSelectorProps): React.JSX.Element {
  const { t } = useTranslation()
  const { data, isLoading, refetch, isFetching } = useNamespaces(clusterId)

  const selected = parseNamespaceSelection(value)

  const options = [
    { value: ALL_NAMESPACES, label: t('common.allNamespaces') },
    ...(data?.namespaces ?? []).map((ns) => ({ value: ns, label: ns }))
  ]

  return (
    <Select
      className="ml-namespace-selector"
      classNames={{ popup: { root: 'ml-namespace-selector-popup' } }}
      mode="multiple"
      allowClear
      maxTagCount="responsive"
      maxTagTextLength={28}
      popupMatchSelectWidth={false}
      styles={{ popup: { root: { minWidth: 280 } } }}
      value={selected}
      onChange={(next) => {
        const normalized = normalizeNamespaceSelect(selected, next ?? [])
        onChange(serializeNamespaceSelection(normalized))
      }}
      loading={isLoading || isFetching}
      options={options}
      showSearch
      optionFilterProp="label"
      placeholder={t('common.selectNamespaces')}
      onOpenChange={(open) => {
        if (open) void refetch()
      }}
    />
  )
}
