import { useEffect, useMemo } from 'react'
import { NotesPanel } from './NotesPanel'
import { useNotesStore } from '../../stores/notesStore'

interface ResourceNotesTabProps {
  clusterId: string
  resourceKind: string
  namespace: string
  resourceName: string
  isActive: boolean
}

export function ResourceNotesTab({
  clusterId,
  resourceKind,
  namespace,
  resourceName,
  isActive
}: ResourceNotesTabProps): React.JSX.Element {
  const notes = useNotesStore((s) => s.notes)
  const refresh = useNotesStore((s) => s.refresh)

  useEffect(() => {
    if (!isActive) return
    void refresh()
  }, [isActive, refresh])

  const filtered = useMemo(
    () =>
      notes.filter(
        (n) =>
          n.scope === 'resource' &&
          n.clusterId === clusterId &&
          n.resourceKind === resourceKind &&
          (n.namespace ?? '') === (namespace ?? '') &&
          n.resourceName === resourceName
      ),
    [notes, clusterId, resourceKind, namespace, resourceName]
  )

  return (
    <NotesPanel
      notes={filtered}
      clusterId={clusterId}
      resourceKind={resourceKind}
      namespace={namespace}
      resourceName={resourceName}
      compact
    />
  )
}
