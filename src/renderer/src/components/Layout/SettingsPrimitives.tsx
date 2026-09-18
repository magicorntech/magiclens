import type { ReactNode } from 'react'
import { Select, Switch, Typography } from 'antd'
import { Check } from 'lucide-react'
import { Icon } from '../ui/Icon'

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}

/** Card block with a heading for a group of related settings. */
export function SettingsSection({
  title,
  description,
  children,
  actions
}: SettingsSectionProps): React.JSX.Element {
  return (
    <section className="ml-settings-section">
      <header className="ml-settings-section__head">
        <div className="ml-settings-section__copy">
          <Typography.Text strong className="ml-settings-section__title">
            {title}
          </Typography.Text>
          {description ? (
            <Typography.Text type="secondary" className="ml-settings-section__desc">
              {description}
            </Typography.Text>
          ) : null}
        </div>
        {actions ? <div className="ml-settings-section__actions">{actions}</div> : null}
      </header>
      <div className="ml-settings-section__body">{children}</div>
    </section>
  )
}

interface SettingsRowProps {
  title: string
  description?: string
  control: ReactNode
  /** Stretch the control under the label (inputs / selects). */
  stacked?: boolean
}

/** Single preference row: label + optional hint + control. */
export function SettingsRow({
  title,
  description,
  control,
  stacked = false
}: SettingsRowProps): React.JSX.Element {
  return (
    <div className={`ml-settings-row${stacked ? ' ml-settings-row--stacked' : ''}`}>
      <div className="ml-settings-row__copy">
        <span className="ml-settings-row__title">{title}</span>
        {description ? <span className="ml-settings-row__desc">{description}</span> : null}
      </div>
      <div className="ml-settings-row__control">{control}</div>
    </div>
  )
}

interface SettingsToggleRowProps {
  title: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function SettingsToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled
}: SettingsToggleRowProps): React.JSX.Element {
  return (
    <SettingsRow
      title={title}
      description={description}
      control={<Switch checked={checked} disabled={disabled} onChange={onChange} />}
    />
  )
}

interface SettingsSelectRowProps<T extends string | number> {
  title: string
  description?: string
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  width?: number | string
}

export function SettingsSelectRow<T extends string | number>({
  title,
  description,
  value,
  options,
  onChange,
  width = '100%'
}: SettingsSelectRowProps<T>): React.JSX.Element {
  return (
    <SettingsRow
      title={title}
      description={description}
      stacked
      control={
        <Select
          value={value}
          options={options}
          onChange={onChange}
          style={{ width, maxWidth: 360 }}
        />
      }
    />
  )
}

interface ThemeSwatchProps {
  name: string
  color: string
  selected: boolean
  onSelect: () => void
}

interface ThemeSchemeCardProps {
  name: string
  description: string
  swatches: string[]
  selected: boolean
  onSelect: () => void
  trailing?: ReactNode
}

/** Compact color chip for the appearance picker. */
export function ThemeSwatch({ name, color, selected, onSelect }: ThemeSwatchProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={`ml-settings-swatch${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      title={name}
    >
      <span className="ml-settings-swatch__dot" style={{ background: color }} />
      <span className="ml-settings-swatch__name">{name}</span>
      {selected ? <Icon icon={Check} variant="micro" className="ml-settings-swatch__check" /> : null}
    </button>
  )
}

export function ThemeSchemeCard({
  name,
  description,
  swatches,
  selected,
  onSelect,
  trailing
}: ThemeSchemeCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={`ml-settings-theme-card${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="ml-settings-theme-card__swatches" aria-hidden>
        {swatches.map((color) => (
          <span key={`${name}-${color}`} style={{ background: color }} />
        ))}
        {trailing}
      </div>
      <div className="ml-settings-theme-card__meta">
        <span className="ml-settings-theme-card__name">
          {name}
          {selected ? <Icon icon={Check} variant="detail" className="ml-settings-theme-card__check" /> : null}
        </span>
        <span className="ml-settings-theme-card__desc">{description}</span>
      </div>
    </button>
  )
}
