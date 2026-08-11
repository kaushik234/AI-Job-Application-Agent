import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from './dto/auth.dto';

describe('AuthController (Unit Tests)', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn().mockResolvedValue({
      user: {
        id: 'usr_001',
        email: 'test@sentinel.ai',
        firstName: 'Kaushik',
        lastName: 'Khandhala',
        role: 'USER',
        isEmailVerified: false,
      },
      emailVerificationToken: 'verify_token_123',
    }),
    login: jest.fn().mockResolvedValue({
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      expiresIn: 900,
      user: {
        id: 'usr_001',
        email: 'test@sentinel.ai',
        firstName: 'Kaushik',
        lastName: 'Khandhala',
        role: 'USER',
        isEmailVerified: true,
      },
    }),
    refreshToken: jest.fn().mockResolvedValue({
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      expiresIn: 900,
    }),
    logout: jest.fn().mockResolvedValue({ success: true, message: 'Logged out' }),
    forgotPassword: jest.fn().mockResolvedValue({ message: 'Reset email sent' }),
    resetPassword: jest.fn().mockResolvedValue({ success: true, message: 'Password reset' }),
    verifyEmail: jest.fn().mockResolvedValue({ success: true, message: 'Email verified' }),
    oauthLogin: jest.fn().mockResolvedValue({ accessToken: 'oauth_access_token' }),
    getProfile: jest.fn().mockResolvedValue({ id: 'usr_001', email: 'test@sentinel.ai' }),
    getUserSessions: jest.fn().mockResolvedValue([]),
    revokeSession: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a new user', async () => {
    const result = await controller.register({
      email: 'test@sentinel.ai',
      password: 'Password123!',
      firstName: 'Kaushik',
      lastName: 'Khandhala',
      role: UserRole.USER,
    });
    expect(result.user.email).toBe('test@sentinel.ai');
    expect(authService.register).toHaveBeenCalled();
  });

  it('should authenticate user and return JWT tokens', async () => {
    const mockReq = { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any;
    const result = await controller.login(
      { email: 'test@sentinel.ai', password: 'Password123!' },
      mockReq,
    );
    expect(result.accessToken).toBe('access_token_123');
    expect(authService.login).toHaveBeenCalled();
  });

  it('should process password reset', async () => {
    const result = await controller.resetPassword({
      token: 'reset_token_123',
      newPassword: 'NewPassword123!',
    });
    expect(result.success).toBe(true);
  });
});
