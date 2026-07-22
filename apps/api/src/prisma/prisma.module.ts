import { Global, Module, OnModuleDestroy } from '@nestjs/common'
import { createPrismaClient, type PrismaClient } from '@magiclens/database'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}

export type { PrismaClient }
export { createPrismaClient }
