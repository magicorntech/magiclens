import { useMemo, useState } from 'react'
import { DatePicker, Select, Space, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import {
  DEFAULT_METRICS_TIME_RANGE,
  METRICS_PRESET_OPTIONS,
  type MetricsPresetRange,
  type MetricsTimeRange
} from '@shared/metricsTimeRange'

interface MetricsTimeRangeSelectProps {
  value?: MetricsTimeRange
  onChange: (range: MetricsTimeRange) => void
}

export function MetricsTimeRangeSelect({
  value = DEFAULT_METRICS_TIME_RANGE,
  onChange
}: MetricsTimeRangeSelectProps): React.JSX.Element {
  const [mode, setMode] = useState<'preset' | 'custom'>(value.type)

  const presetValue = value.type === 'preset' ? value.preset : undefined
  const customRange = useMemo<[Dayjs, Dayjs] | null>(() => {
    if (value.type !== 'custom') return null
    return [dayjs.unix(value.start), dayjs.unix(value.end)]
  }, [value])

  return (
    <Space wrap size="small" style={{ marginBottom: 12 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Time range
      </Typography.Text>
      <Select
        size="small"
        value={mode}
        style={{ width: 120 }}
        options={[
          { value: 'preset', label: 'Preset' },
          { value: 'custom', label: 'Custom' }
        ]}
        onChange={(nextMode) => {
          setMode(nextMode)
          if (nextMode === 'preset') {
            onChange({ type: 'preset', preset: presetValue ?? '30m' })
          } else {
            const end = dayjs()
            onChange({ type: 'custom', start: end.subtract(1, 'hour').unix(), end: end.unix() })
          }
        }}
      />
      {mode === 'preset' ? (
        <Select
          size="small"
          value={presetValue ?? '30m'}
          style={{ minWidth: 160 }}
          options={METRICS_PRESET_OPTIONS}
          onChange={(preset: MetricsPresetRange) => onChange({ type: 'preset', preset })}
        />
      ) : (
        <DatePicker.RangePicker
          size="small"
          showTime
          value={customRange}
          onChange={(dates) => {
            if (!dates?.[0] || !dates[1]) return
            onChange({ type: 'custom', start: dates[0].unix(), end: dates[1].unix() })
          }}
        />
      )}
    </Space>
  )
}
