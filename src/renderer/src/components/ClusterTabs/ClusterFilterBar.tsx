import { Segmented } from 'antd'
import { clusterFilterOptions } from '../../clusterFilter'
import type { ClusterFilter } from '../../clusterFilter'

interface ClusterFilterBarProps {
  value: ClusterFilter
  onChange: (filter: ClusterFilter) => void
}

export function ClusterFilterBar({ value, onChange }: ClusterFilterBarProps): React.JSX.Element {
  return (
    <Segmented
      value={value}
      onChange={(v) => onChange(v as ClusterFilter)}
      options={clusterFilterOptions.map((o) => ({ label: o.label, value: o.value }))}
    />
  )
}
