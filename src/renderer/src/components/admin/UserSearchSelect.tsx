import { useMemo, useState } from 'react'
import { Select, Spin } from 'antd'
import { enterpriseApi } from '../../enterprise/api'

type Member = {
  id: string
  role: string
  user: { id: string; name: string; email: string; status: string }
}

interface UserSearchSelectProps {
  value?: string
  onChange?: (userId: string | undefined, member?: Member) => void
  placeholder?: string
  style?: React.CSSProperties
  allowClear?: boolean
  disabled?: boolean
}

/** Searchable org-member picker (name / email). Value is user.id. */
export function UserSearchSelect({
  value,
  onChange,
  placeholder = 'Search users by name or email',
  style,
  allowClear = true,
  disabled
}: UserSearchSelectProps): React.JSX.Element {
  const [options, setOptions] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  async function load(q = ''): Promise<void> {
    setLoading(true)
    try {
      const rows = await enterpriseApi<Member[]>(
        `/users${q ? `?q=${encodeURIComponent(q)}` : ''}`
      )
      setOptions(rows)
      setFetched(true)
    } finally {
      setLoading(false)
    }
  }

  const selectOptions = useMemo(
    () =>
      options.map((m) => ({
        value: m.user.id,
        label: `${m.user.name} · ${m.user.email}`,
        member: m
      })),
    [options]
  )

  return (
    <Select
      showSearch
      allowClear={allowClear}
      disabled={disabled}
      value={value}
      placeholder={placeholder}
      style={{ width: '100%', ...style }}
      filterOption={false}
      notFoundContent={loading ? <Spin size="small" /> : fetched ? 'No users found' : null}
      options={selectOptions}
      onDropdownVisibleChange={(open) => {
        if (open && !fetched) void load()
      }}
      onSearch={(q) => {
        void load(q)
      }}
      onChange={(id) => {
        const member = options.find((m) => m.user.id === id)
        onChange?.(id, member)
      }}
    />
  )
}
