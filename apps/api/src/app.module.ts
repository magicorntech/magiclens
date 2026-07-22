import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { join } from 'path'
import { LoggerModule } from 'nestjs-pino'
import { PrismaModule } from './prisma/prisma.module'
import { QueueModule } from './queue/queue.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { OrganizationsModule } from './organizations/organizations.module'
import { UsersModule } from './users/users.module'
import { InvitationsModule } from './invitations/invitations.module'
import { TeamsModule } from './teams/teams.module'
import { KubeconfigsModule } from './kubeconfigs/kubeconfigs.module'
import { PermissionsModule } from './permissions/permissions.module'
import { AuditModule } from './audit/audit.module'
import { VpnModule } from './vpn/vpn.module'
import { NotificationsModule } from './notifications/notifications.module'
import { ResourcePackagesModule } from './resource-packages/resource-packages.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '../../../.env'),
        join(process.cwd(), '../../.env'),
        join(process.cwd(), '.env')
      ]
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined
      }
    }),
    PrismaModule,
    QueueModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    InvitationsModule,
    TeamsModule,
    KubeconfigsModule,
    PermissionsModule,
    AuditModule,
    VpnModule,
    NotificationsModule,
    ResourcePackagesModule
  ]
})
export class AppModule {}
