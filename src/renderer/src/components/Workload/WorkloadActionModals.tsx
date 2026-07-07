import type { WorkloadKind } from '@shared/types/workload'
import type { WorkloadModal } from './useWorkloadActions'
import type { useWorkloadActions } from './useWorkloadActions'
import { ScaleModal } from './ScaleModal'
import { RestartConfirmationModal } from './RestartConfirmationModal'
import { ChangeImageModal } from './ChangeImageModal'
import { RolloutHistoryDrawer } from './RolloutHistoryDrawer'

type WorkloadActions = ReturnType<typeof useWorkloadActions>

interface WorkloadActionModalsProps {
  clusterId: string
  kind: WorkloadKind
  namespace: string
  name: string
  workload: WorkloadActions
}

export function WorkloadActionModals({
  clusterId,
  kind,
  namespace,
  name,
  workload
}: WorkloadActionModalsProps): React.JSX.Element {
  const modal = workload.modal as WorkloadModal

  return (
    <>
      <ScaleModal
        open={modal === 'scale'}
        kind={kind}
        namespace={namespace}
        name={name}
        context={workload.context}
        loading={workload.actionLoading}
        onCancel={() => workload.setModal(null)}
        onConfirm={workload.confirmScale}
      />
      <RestartConfirmationModal
        open={modal === 'restart'}
        kind={kind}
        namespace={namespace}
        name={name}
        context={workload.context}
        loading={workload.actionLoading}
        onCancel={() => workload.setModal(null)}
        onConfirm={workload.confirmRestart}
      />
      <ChangeImageModal
        open={modal === 'changeImage'}
        kind={kind}
        namespace={namespace}
        name={name}
        containers={workload.context?.containers ?? []}
        loading={workload.actionLoading}
        onCancel={() => workload.setModal(null)}
        onConfirm={workload.confirmChangeImage}
      />
      <RolloutHistoryDrawer
        open={modal === 'rolloutHistory' || modal === 'rollback'}
        clusterId={clusterId}
        kind={kind}
        namespace={namespace}
        name={name}
        mode={modal === 'rollback' ? 'rollback' : 'history'}
        loading={workload.actionLoading}
        onClose={() => workload.setModal(null)}
        onRollback={(revision) => workload.confirmRollback(revision)}
      />
    </>
  )
}
