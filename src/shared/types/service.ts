export interface ServicePortInfo {
  name?: string
  port: number
  targetPort: string
  protocol: string
}

export interface ServiceDetailResponse {
  type: string
  clusterIP: string
  ports: ServicePortInfo[]
}

export interface ServiceResourceRequest {
  clusterId: string
  namespace: string
  serviceName: string
}
