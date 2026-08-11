import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards, UseFilters, UseInterceptors, HttpStatus, HttpCode, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  OAuthLoginDto,
  AuthTokenResponseDto,
  AuthUserResponseDto,
  UserRole,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthExceptionFilter } from './filters/auth.filter';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { IAuthUser } from './interfaces/auth.interface';

@ApiTags('Auth')
@Controller('auth')
@UseFilters(AuthExceptionFilter)
@UseInterceptors(AuthInterceptor)
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user account' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User authentication login with JWT' })
  @ApiResponse({ status: 200, type: AuthTokenResponseDto })
  async login(@Body() loginDto: LoginDto, @Req() req: any): Promise<AuthTokenResponseDto> {
    const ipAddress = (req.headers?.['x-forwarded-for'] as string) || req.socket?.remoteAddress;
    const userAgent = req.headers?.['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, type: AuthTokenResponseDto })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthTokenResponseDto> {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke current user session' })
  async logout(@CurrentUser() user: any, @Body() dto?: RefreshTokenDto) {
    const currentUser = user as IAuthUser;
    return this.authService.logout(currentUser.id, dto?.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset token via email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password using token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email address using token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('oauth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OAuth login/registration handler (Google / GitHub)' })
  @ApiResponse({ status: 200, type: AuthTokenResponseDto })
  async oauthLogin(@Body() dto: OAuthLoginDto): Promise<AuthTokenResponseDto> {
    return this.authService.oauthLogin(dto);
  }

  @Get('oauth/google')
  @ApiOperation({ summary: 'Initiate Google OAuth2 authentication flow' })
  async googleAuth() {
    return {
      message: 'Google OAuth redirection endpoint',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=GOOGLE_CLIENT_ID&response_type=code&scope=openid%20email%20profile',
    };
  }

  @Get('oauth/github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth2 authentication flow' })
  async githubAuth() {
    return {
      message: 'GitHub OAuth redirection endpoint',
      authUrl: 'https://github.com/login/oauth/authorize?client_id=GITHUB_CLIENT_ID&scope=user:email',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile details of authenticated user' })
  @ApiResponse({ status: 200, type: AuthUserResponseDto })
  async getProfile(@CurrentUser() user: any): Promise<AuthUserResponseDto> {
    const currentUser = user as IAuthUser;
    return this.authService.getProfile(currentUser.id);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of active sessions for current user' })
  async getSessions(@CurrentUser() user: any) {
    const currentUser = user as IAuthUser;
    return this.authService.getUserSessions(currentUser.id);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke specific active user session' })
  @ApiParam({ name: 'id', description: 'Session ID to revoke' })
  async revokeSession(@CurrentUser() user: any, @Param('id') sessionId: string) {
    const currentUser = user as IAuthUser;
    return this.authService.revokeSession(currentUser.id, sessionId);
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin-only protected route demo (RBAC test)' })
  async adminOnlyRoute(@CurrentUser() user: any) {
    const currentUser = user as IAuthUser;
    return {
      message: 'Welcome Admin! You have elevated authorization access.',
      adminUser: currentUser,
    };
  }
}
