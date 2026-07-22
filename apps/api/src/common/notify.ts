import type { PrismaClient } from '@magiclens/database'

export async function notifyUsers(
  prisma: PrismaClient,
  params: {
    userIds: string[]
    organizationId?: string
    type: string
    title: string
    body?: string
    resourceType?: string
    resourceId?: string
  }
): Promise<void> {
  const unique = [...new Set(params.userIds)].filter(Boolean)
  if (unique.length === 0) return
  await prisma.userNotification.createMany({
    data: unique.map((userId) => ({
      userId,
      organizationId: params.organizationId,
      type: params.type,
      title: params.title,
      body: params.body,
      resourceType: params.resourceType,
      resourceId: params.resourceId
    }))
  })
}
