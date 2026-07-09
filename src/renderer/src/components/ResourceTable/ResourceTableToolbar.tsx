interface ResourceTableToolbarProps {
  search: React.ReactNode
  actions: React.ReactNode
}

/** Search left, actions right — independent per split panel. */
export function ResourceTableToolbar({ search, actions }: ResourceTableToolbarProps): React.JSX.Element {
  return (
    <div className="ml-resource-toolbar">
      <div className="ml-resource-toolbar-search">{search}</div>
      <div className="ml-resource-toolbar-divider" aria-hidden />
      <div className="ml-resource-toolbar-actions">{actions}</div>
    </div>
  )
}
