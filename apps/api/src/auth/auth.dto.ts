import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'owner@magiclens.local' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'MagicLens123!' })
  @IsString()
  @MinLength(8)
  password!: string
}

export class DevLoginDto {
  @ApiProperty({ example: 'owner@magiclens.local' })
  @IsEmail()
  email!: string

  @ApiPropertyOptional({ example: 'Owner Admin' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string
}

export class ChangePasswordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentPassword?: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword!: string
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string
}
