import type { ReactNode } from 'react'
import { useState } from 'react'
import { Typography } from 'antd'
import { Eye, EyeOff } from 'lucide-react'
import { Icon } from '../ui/Icon'

export function DetailSection({
  title,
  extra,
  children
}: {
  title: string
  extra?: ReactNode
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="ml-detail-section">
      <div className="ml-detail-section__head">
        <span className="ml-detail-section__title">{title}</span>
        {extra}
      </div>
      <div className="ml-detail-section__body">{children}</div>
    </section>
  )
}

export function DetailFactGrid({
  facts
}: {
  facts: { label: string; value: ReactNode }[]
}): React.JSX.Element {
  return (
    <div className="ml-detail-facts">
      {facts.map((f) => (
        <div className="ml-detail-fact" key={f.label}>
          <span className="ml-detail-fact__label">{f.label}</span>
          <span className="ml-detail-fact__value">{f.value ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}

export function DetailChips({ data }: { data: Record<string, string> | undefined }): React.JSX.Element {
  const entries = Object.entries(data ?? {})
  if (!entries.length) return <span className="ml-detail-empty">—</span>
  return (
    <div className="ml-detail-chips">
      {entries.map(([k, v]) => (
        <span className="ml-detail-chip" key={k} title={v ? `${k}=${v}` : k}>
          {k}
          {v ? <span className="ml-detail-chip__v">{v}</span> : null}
        </span>
      ))}
    </div>
  )
}

export function DetailKVList({
  data,
  empty,
  maskValues = false
}: {
  data: Record<string, string> | undefined
  empty: string
  maskValues?: boolean
}): React.JSX.Element {
  const entries = Object.entries(data ?? {})
  if (!entries.length) return <span className="ml-detail-empty">{empty}</span>
  if (!maskValues) {
    return (
      <dl className="ml-detail-kv">
        {entries.map(([k, v]) => (
          <div key={k} className="ml-detail-kv__row">
            <dt>{k}</dt>
            <dd>
              <span className="ml-detail-mono">{v}</span>
            </dd>
          </div>
        ))}
      </dl>
    )
  }
  return <MaskedKVList entries={entries} />
}

function MaskedKVList({ entries }: { entries: [string, string][] }): React.JSX.Element {
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())

  function toggle(name: string): void {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <dl className="ml-detail-kv">
      {entries.map(([k, v]) => {
        const open = revealed.has(k)
        return (
          <div key={k} className="ml-detail-kv__row">
            <dt>{k}</dt>
            <dd className="ml-detail-env-value">
              {open ? (
                <span className="ml-detail-mono">{v || '""'}</span>
              ) : (
                <span className="ml-detail-mono ml-detail-env-masked">••••••••</span>
              )}
              <button
                type="button"
                className="ml-detail-env-reveal"
                aria-label={open ? 'Hide value' : 'Show value'}
                aria-pressed={open}
                onClick={() => toggle(k)}
              >
                <Icon icon={open ? EyeOff : Eye} variant="micro" />
              </button>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export function DetailSubblock({
  label,
  children
}: {
  label: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className="ml-detail-subblock">
      <span className="ml-detail-subblock__label">{label}</span>
      {children}
    </div>
  )
}

export function DetailEmpty({ children }: { children: ReactNode }): React.JSX.Element {
  return <span className="ml-detail-empty">{children}</span>
}

export function DetailMono({ children }: { children: ReactNode }): React.JSX.Element {
  return <span className="ml-detail-mono">{children}</span>
}

export function DetailToolbar({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="ml-detail-toolbar">{children}</div>
}

export function DetailToolButton({
  children,
  onClick,
  danger,
  warn,
  title
}: {
  children: ReactNode
  onClick?: () => void
  danger?: boolean
  warn?: boolean
  title?: string
}): React.JSX.Element {
  const cls = [
    'ml-detail-tool',
    warn ? 'ml-detail-tool--warn' : '',
    danger ? 'ml-detail-tool--danger' : ''
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} onClick={onClick} title={title}>
      {children}
    </button>
  )
}

export function DetailToolbarSpacer(): React.JSX.Element {
  return <span className="ml-detail-toolbar__spacer" />
}

export function DetailPane({
  children,
  full
}: {
  children: ReactNode
  full?: boolean
}): React.JSX.Element {
  return <div className={`ml-detail-pane${full ? ' ml-detail-pane--full' : ''}`}>{children}</div>
}

export function DetailOverview({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="ml-detail-overview">{children}</div>
}

export function DetailConditionList({
  conditions
}: {
  conditions: { type: string; status: string; reason?: string; message?: string }[]
}): React.JSX.Element {
  if (!conditions.length) return <DetailEmpty>—</DetailEmpty>
  return (
    <dl className="ml-detail-kv">
      {conditions.map((c) => (
        <div key={c.type} className="ml-detail-kv__row">
          <dt>
            {c.type}{' '}
            <Typography.Text type={c.status === 'True' ? 'success' : 'danger'}>{c.status}</Typography.Text>
          </dt>
          <dd>{c.reason || c.message || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
