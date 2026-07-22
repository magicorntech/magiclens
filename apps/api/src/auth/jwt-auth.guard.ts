import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
  Inject
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { verifyAccessToken } from '@magiclens/auth'
import type { Request } from 'express'

export interface AuthUser {
  id: string
  email: string
  orgId?: string
  role?: string
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor( @Inject(ConfigService) private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token')
    }
    try {
      const secret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET')
      const payload = verifyAccessToken(header.slice(7), secret)
      req.user = {
        id: payload.sub,
        email: payload.email,
        orgId: payload.orgId,
        role: payload.role
      }
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired access token')
    }
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>()
  return req.user
})
