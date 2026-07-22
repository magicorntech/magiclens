import type { PrismaClient, Prisma } from '@magiclens/database'

export interface AuditWriteInput {
  organizationId?: string | null
  userId?: string | null
  action: string
  result: 'success' | 'denied' | 'error'
  resourceType?: string
  resourceName?: string
  clusterId?: string
  namespace?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function writeAuditLog(prisma: PrismaClient, input: AuditWriteInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      result: input.result,
      resourceType: input.resourceType,
      resourceName: input.resourceName,
      clusterId: input.clusterId,
      namespace: input.namespace,
      metadataJson: (input.metadata ?? {}) as Prisma.InputJsonValue,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  })
}
