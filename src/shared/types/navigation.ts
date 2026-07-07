import type { ResourceKind } from '@shared/resourceKinds'

export interface ResourceFocus {
  kind: ResourceKind
  namespace: string
  name: string
}
