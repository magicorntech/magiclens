import { Body, Controller, Get, Post, Query, UseGuards, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IsArray, IsOptional, IsString } from 'class-validator'
import { JwtAuthGuard, CurrentUser, type AuthUser } from '../auth/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'

class MarkReadDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[]

  @IsOptional()
  all?: boolean
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('unread') unread?: string) {
    return this.prisma.client.userNotification.findMany({
      where: {
        userId: user.id,
        ...(unread === '1' || unread === 'true' ? { readAt: null } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  }

  @Post('read')
  async markRead(@CurrentUser() user: AuthUser, @Body() body: MarkReadDto) {
    if (body.all) {
      await this.prisma.client.userNotification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() }
      })
    } else if (body.ids?.length) {
      await this.prisma.client.userNotification.updateMany({
        where: { userId: user.id, id: { in: body.ids }, readAt: null },
        data: { readAt: new Date() }
      })
    }
    return { ok: true }
  }
}
