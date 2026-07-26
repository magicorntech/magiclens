interface ResourceTableToolbarProps {
  /** Optional control before search (e.g. namespace selector). */
  leading?: React.ReactNode
  search: React.ReactNode
  actions?: React.ReactNode
}

/** Leading + search left, actions right — same layout on every resource page. */
export function ResourceTableToolbar({
  leading,
  search,
  actions
}: ResourceTableToolbarProps): React.JSX.Element {
  return (
    <div className="ml-resource-toolbar">
      <div className="ml-resource-toolbar-start">
        {leading ? <div className="ml-resource-toolbar-leading">{leading}</div> : null}
        <div className="ml-resource-toolbar-search">{search}</div>
      </div>
      {actions ? (
        <>
          <div className="ml-resource-toolbar-divider" aria-hidden />
          <div className="ml-resource-toolbar-actions">{actions}</div>
        </>
      ) : null}
    </div>
  )
}
