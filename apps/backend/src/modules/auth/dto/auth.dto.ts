import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export class LoginDto {
  @ApiProperty({ example: 'khandhalakaushik234@gmail.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Password123!', description: 'User password' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'khandhalakaushik234@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: 'Kaushik' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Khandhala' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.USER;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'JWT Refresh Token' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'khandhalakaushik234@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token received via email' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'NewStrongPassword123!' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  newPassword!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class OAuthLoginDto {
  @ApiProperty({ example: 'google', enum: ['google', 'github'] })
  @IsString()
  @IsNotEmpty()
  provider!: 'google' | 'github';

  @ApiProperty({ example: 'google_123456789' })
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @ApiProperty({ example: 'khandhalakaushik234@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Kaushik' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Khandhala' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;
}

export class AuthUserResponseDto {
  @ApiProperty({ type: String, example: 'usr_12345' })
  id!: string;

  @ApiProperty({ type: String, example: 'khandhalakaushik234@gmail.com' })
  email!: string;

  @ApiProperty({ type: String, example: 'Kaushik' })
  firstName!: string;

  @ApiProperty({ type: String, example: 'Khandhala' })
  lastName!: string;

  @ApiProperty({ type: String, example: 'USER' })
  role!: string;

  @ApiProperty({ type: Boolean, example: true })
  isEmailVerified!: boolean;
}

export class AuthTokenResponseDto {
  @ApiProperty({ type: String, example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ type: String, example: 'd3f2a1...' })
  refreshToken!: string;

  @ApiProperty({ type: Number, example: 900 })
  expiresIn!: number;

  @ApiProperty({ type: () => AuthUserResponseDto })
  user!: AuthUserResponseDto;
}
