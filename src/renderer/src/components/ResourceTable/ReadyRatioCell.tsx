interface ReadyRatioCellProps {
  value: string | undefined
}

/** Renders ready/desired counts such as `2/3` with emphasis when fully ready. */
export function ReadyRatioCell({ value }: ReadyRatioCellProps): React.JSX.Element {
  if (!value || value === '-') return <>-</>

  const [readyStr, desiredStr] = value.split('/')
  const ready = Number(readyStr)
  const desired = Number(desiredStr)
  const complete = Number.isFinite(ready) && Number.isFinite(desired) && desired > 0 && ready === desired

  return (
    <span className={`ml-ready-ratio${complete ? ' ml-ready-ratio--complete' : ''}`} title={value}>
      {value}
    </span>
  )
}
