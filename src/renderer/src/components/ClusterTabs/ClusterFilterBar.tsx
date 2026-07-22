import { Segmented } from 'antd'
import { useTranslation } from 'react-i18next'
import { clusterFilterValues } from '../../clusterFilter'
import type { ClusterFilter } from '../../clusterFilter'

interface ClusterFilterBarProps {
  value: ClusterFilter
  onChange: (filter: ClusterFilter) => void
}

export function ClusterFilterBar({ value, onChange }: ClusterFilterBarProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <Segmented
      value={value}
      onChange={(v) => onChange(v as ClusterFilter)}
      options={clusterFilterValues.map((filterValue) => ({
        label: t(`clustersHub.filters.${filterValue}`),
        value: filterValue
      }))}
    />
  )
}
