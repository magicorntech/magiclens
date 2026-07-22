import { Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNamespaces } from '../../queries/useNamespaces'

interface NamespaceSelectorProps {
  clusterId: string
  value: string
  onChange: (namespace: string) => void
}

export function NamespaceSelector({ clusterId, value, onChange }: NamespaceSelectorProps): React.JSX.Element {
  const { t } = useTranslation()
  const { data, isLoading, refetch, isFetching } = useNamespaces(clusterId)

  const options = [
    { value: 'ALL', label: t('common.allNamespaces') },
    ...(data?.namespaces ?? []).map((ns) => ({ value: ns, label: ns }))
  ]

  return (
    <Select
      style={{ width: 220 }}
      value={value}
      onChange={onChange}
      loading={isLoading || isFetching}
      options={options}
      showSearch
      optionFilterProp="label"
      onOpenChange={(open) => {
        if (open) void refetch()
      }}
    />
  )
}
