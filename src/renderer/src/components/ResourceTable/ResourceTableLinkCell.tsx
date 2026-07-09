interface ResourceTableLinkCellProps {
  label: string
  title?: string
  onClick: () => void
}

export function ResourceTableLinkCell({ label, title, onClick }: ResourceTableLinkCellProps): React.JSX.Element {
  if (!label || label === '-') return <>-</>

  return (
    <button
      type="button"
      className="ml-table-link"
      title={title ?? label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {label}
    </button>
  )
}
