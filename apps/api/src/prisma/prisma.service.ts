import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { createPrismaClient, type PrismaClient } from '@magiclens/database'

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient = createPrismaClient()

  async onModuleInit(): Promise<void> {
    await this.client.$connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect()
  }
}
