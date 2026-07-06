import { Input } from 'antd'

interface ClusterSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  size?: 'small' | 'middle' | 'large'
}

export function ClusterSearchInput({ value, onChange, placeholder, size }: ClusterSearchInputProps): React.JSX.Element {
  return (
    <Input.Search
      allowClear
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? 'Search clusters'}
      size={size}
    />
  )
}

interface HighlightTextProps {
  text: string
  query: string
}

export function HighlightText({ text, query }: HighlightTextProps): React.JSX.Element {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
