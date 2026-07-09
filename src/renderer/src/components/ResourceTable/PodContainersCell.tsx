export interface PodContainerStatusDot {
  ready: boolean
  waiting?: boolean
  terminated?: boolean
  running?: boolean
  init?: boolean
}

interface PodContainersCellProps {
  data: string | undefined
}

export function PodContainersCell({ data }: PodContainersCellProps): React.JSX.Element {
  if (!data) return <>-</>

  let statuses: PodContainerStatusDot[] = []
  try {
    statuses = JSON.parse(data) as PodContainerStatusDot[]
  } catch {
    return <>-</>
  }

  if (statuses.length === 0) return <>-</>

  return (
    <span className="ml-pod-containers-cell" onClick={(e) => e.stopPropagation()}>
      {statuses.map((status, index) => {
        let tone = 'pending'
        if (status.ready) tone = 'ready'
        else if (status.terminated) tone = 'terminated'
        else if (status.waiting) tone = 'waiting'
        else if (status.running) tone = 'running'

        const label = status.init ? `init #${index + 1}` : `container #${index + 1}`
        return (
          <span
            key={`${label}-${index}`}
            className={`ml-pod-container-dot ml-pod-container-dot--${tone}${status.init ? ' ml-pod-container-dot--init' : ''}`}
            title={`${label}: ${tone}`}
          />
        )
      })}
    </span>
  )
}
