import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  Inject
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { ChangePasswordDto, DevLoginDto, LoginDto, RefreshDto } from './auth.dto'
import { CurrentUser, JwtAuthGuard, type AuthUser } from './jwt-auth.guard'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request) {
    return this.auth.loginWithPassword(body.email, body.password, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    })
  }

  /** Local/dev login without password — keep for bootstrapping when ALLOW_DEV_LOGIN=true */
  @Post('dev/login')
  async devLogin(@Body() body: DevLoginDto, @Req() req: Request) {
    if (this.config.get('ALLOW_DEV_LOGIN') !== 'true' && process.env.NODE_ENV === 'production') {
      return { message: 'Dev login disabled. Use POST /auth/login.' }
    }
    return this.auth.registerOrLoginLocal(body.email, body.name, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    })
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordDto) {
    return this.auth.changePassword(user.id, body.newPassword, body.currentPassword)
  }

  @Get('google')
  googleStart(@Res() res: Response) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID')
    if (!clientId) {
      return res.status(501).json({
        message: 'Google OAuth is not configured. Use POST /auth/login for local development.'
      })
    }
    const callback = this.config.getOrThrow('GOOGLE_CALLBACK_URL')
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', callback)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')
    return res.redirect(url.toString())
  }

  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const code = String(req.query.code ?? '')
    const clientId = this.config.get('GOOGLE_CLIENT_ID')
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET')
    if (!clientId || !clientSecret || !code) {
      return res.status(400).json({ message: 'Missing Google OAuth configuration or code' })
    }

    const callback = this.config.getOrThrow('GOOGLE_CALLBACK_URL')
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callback,
        grant_type: 'authorization_code'
      })
    })
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string }
    if (!tokenJson.access_token) {
      return res.status(400).json({ message: tokenJson.error ?? 'Failed to exchange code' })
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` }
    })
    const profile = (await profileRes.json()) as {
      sub: string
      email: string
      email_verified: boolean
      name: string
      picture?: string
    }

    const session = await this.auth.linkOrLoginGoogle(
      {
        id: profile.sub,
        email: profile.email,
        emailVerified: !!profile.email_verified,
        name: profile.name,
        avatarUrl: profile.picture
      },
      { userAgent: req.headers['user-agent'], ipAddress: req.ip }
    )

    const desktop = this.config.get('DESKTOP_CALLBACK_URL') ?? 'magiclens://auth/callback'
    const redirect = new URL(desktop)
    redirect.searchParams.set('accessToken', session.accessToken)
    redirect.searchParams.set('refreshToken', session.refreshToken)
    return res.redirect(redirect.toString())
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(body.refreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    })
  }

  @Post('logout')
  async logout(@Body() body: RefreshDto) {
    await this.auth.logout(body.refreshToken)
    return { ok: true }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: AuthUser) {
    await this.auth.logoutAll(user.id)
    return { ok: true }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getMe(user.id)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser) {
    return this.auth.listSessions(user.id)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.auth.revokeSession(user.id, id)
    return { ok: true }
  }
}
